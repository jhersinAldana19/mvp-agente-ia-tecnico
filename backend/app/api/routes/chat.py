from typing import List
import logging

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.security import get_current_user
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.source import SourceItem
from app.services.llm.factory import get_llm_provider
from app.services.supabase_service import SupabaseService

from app.services.manual_lubrication_service import LUB_MD_FILENAME, LUB_PDF_FILENAME
from app.services.manual_specs_service import SPECS_MD_FILENAME, SPECS_PDF_FILENAME

router = APIRouter()
logger = logging.getLogger(__name__)

_RAG_TOP_K            = 12
_RAG_TOP_K_COMERCIAL  = 4   # slots para brochures en cada consulta
_NS_TECNICO           = "trs4531"
_NS_COMERCIAL         = "trs4531-comercial"
_SPECS_DOC_MD         = SPECS_MD_FILENAME
_SPECS_DOC_PDF_LEGACY = SPECS_PDF_FILENAME
_LUB_DOC_MD           = LUB_MD_FILENAME
_LUB_DOC_PDF_LEGACY   = LUB_PDF_FILENAME

# Términos coloquiales → equivalentes técnicos usados en los documentos.
_SYNONYM_MAP = {
    "marca":         "fabricante modelo",
    "quién fabrica": "fabricante",
    "quien fabrica": "fabricante",
    "fabricado por": "fabricante",
    "hecho por":     "fabricante",
    "proveedor":     "fabricante proveedor",
}

# Palabras que indican pregunta de especificación técnica del equipo.
# Cuando aparecen, se fuerza recuperación adicional desde cap9 (tabla de specs).
_SPEC_WORDS = frozenset({
    "marca", "fabricante", "modelo", "tipo",
    "lleva", "tiene", "usa", "equipa",
    "qué", "que", "cuál", "cual",
    "transmisión", "transmision", "motor", "frenos", "freno",
    "suspensión", "suspension", "llantas", "aceite", "presión",
    "presion", "capacidad", "potencia", "peso", "dimensión", "dimension",
})

# Palabras que indican pregunta de lubricación/aceites.
# Cuando aparecen, se fuerza recuperación adicional desde cap7 (tabla de lubricantes).
_LUBRICACION_WORDS = frozenset({
    "aceite", "lubricante", "lubricacion", "lubricación",
    "grasa", "hidráulico", "hidraulico",
    "dexron", "iso vg", "mil-l", "acea", "sae 10",
    "cambio aceite", "nivel aceite", "capacidad litros",
    "frenos aceite", "transmision aceite", "transmisión aceite",
    "mantenimiento aceite", "lubrica", "engrasa",
    "nota 5", "nota 8", "nota 9", "nota 10", "nota 13",
})

_FAULT_CODES_FILTER = {"doc_type": {"$eq": "fault_codes"}}
_SPARE_PARTS_FILTER = {"doc_type": {"$eq": "spare_parts"}}
_SPARE_INDEX_FILTER = {
    "doc_type": {"$eq": "spare_parts"},
    "document_subtype": {"$eq": "indice_general_manual_repuestos"},
}
_SPARE_INSTRUCTIONS_FILTER = {
    "doc_type": {"$eq": "spare_parts"},
    "document_subtype": {"$eq": "instrucciones_manual_repuestos"},
}


def _is_legacy_fault_pdf(document_name: str) -> bool:
    """PDFs antiguos de códigos de falla (pre-Markdown) que compiten con las fichas .md."""
    n = document_name.lower()
    return n.endswith(".pdf") and "codigos de error" in n


def _is_legacy_specs_pdf(document_name: str) -> bool:
    """PDF cap9 — reemplazado por cap9-especificaciones-trs4531.md para tablas."""
    return document_name == _SPECS_DOC_PDF_LEGACY


def _is_legacy_lubricacion_pdf(document_name: str) -> bool:
    """PDF cap7 — reemplazado por cap7-lubricacion-trs4531-v1.md."""
    return document_name == _LUB_DOC_PDF_LEGACY


def _exact_fault_filter(fault_parsed) -> dict | None:
    """Filtro Pinecone por código exacto o par SPN+FMI (todos los subsistemas)."""
    if fault_parsed.is_ambiguous:
        return None
    base = {"doc_type": {"$eq": "fault_codes"}}
    if fault_parsed.primary_code:
        return {**base, "fault_code": {"$eq": fault_parsed.primary_code}}
    if fault_parsed.spn and fault_parsed.fmi:
        return {
            **base,
            "spn": {"$eq": fault_parsed.spn},
            "fmi": {"$eq": fault_parsed.fmi},
        }
    return None


def _subsystem_fault_filter(fault_code: str, subsystem: str) -> dict:
    return {
        "doc_type": {"$eq": "fault_codes"},
        "fault_code": {"$eq": fault_code},
        "subsystem": {"$eq": subsystem},
    }


def _log_fault_retrieval(fault_parsed, label: str, results: list) -> None:
    if settings.environment != "development":
        return
    logger.info(
        "FAULT_RAG [%s] code=%s spn=%s fmi=%s hits=%d",
        label,
        fault_parsed.primary_code,
        fault_parsed.spn,
        fault_parsed.fmi,
        len(results),
    )
    for i, s in enumerate(results[:8], 1):
        logger.info(
            "  #%d score=%.4f doc=%s sys=%s sub=%s fc=%s page=%s",
            i, s.score, s.document_name, s.system, s.subsystem,
            s.fault_code, s.page,
        )


def _entry_to_source(entry: dict) -> SourceItem:
    return SourceItem(
        document_name=entry["document_name"],
        page=entry["page"],
        score=1.0,
        snippet=entry["snippet"],
        chunk_index=entry.get("chunk_index"),
        fault_code=entry.get("fault_code"),
        system=entry.get("system"),
        subsystem=entry.get("subsystem"),
    )


def _is_spec_question(question: str) -> bool:
    """True si la pregunta es sobre especificaciones técnicas del equipo."""
    q = question.lower()
    return sum(1 for w in _SPEC_WORDS if w in q) >= 2


def _is_lubricacion_question(question: str) -> bool:
    """True si la pregunta es sobre aceites, lubricantes o mantenimiento de fluidos."""
    q = question.lower()
    return any(w in q for w in _LUBRICACION_WORDS)


def _synonym_query(question: str) -> str | None:
    """Reformula con términos técnicos del documento, o None si no aplica."""
    q = question.lower()
    for colloquial, technical in _SYNONYM_MAP.items():
        if colloquial in q:
            return q.replace(colloquial, technical)
    return None


async def _retrieve_sources(question: str) -> tuple[List[SourceItem], str]:
    """Búsqueda multi-namespace: manuales técnicos + brochures comerciales."""
    from app.services.embeddings.factory import get_embedding_provider
    from app.services.fault_code_parser import (
        build_ambiguity_context,
        parse_fault_code_query,
    )
    from app.services.fault_codes_service import (
        buscar_codigo_falla,
        formatear_contexto_falla,
        infer_subsystem_hints,
        snippet_contains_code,
    )
    from app.services.spare_parts_parser import parse_spare_parts_query
    from app.services.spare_parts_service import (
        buscar_dibujo,
        buscar_numero_parte,
        formatear_contexto_repuesto,
        snippet_contains_part_number,
    )
    from app.services.pinecone_service import PineconeService

    embedder = get_embedding_provider()
    pinecone  = PineconeService()

    fault_parsed = parse_fault_code_query(question)
    spare_parsed = parse_spare_parts_query(question)
    structured_fault = ""
    structured_spare = ""
    if fault_parsed.is_ambiguous:
        structured_fault = build_ambiguity_context(fault_parsed)

    if settings.environment == "development" and fault_parsed.is_fault_question:
        logger.info(
            "FAULT_PARSE code=%s spn=%s fmi=%s ambiguous=%s",
            fault_parsed.primary_code,
            fault_parsed.spn,
            fault_parsed.fmi,
            fault_parsed.is_ambiguous,
        )

    if settings.environment == "development" and spare_parsed.is_spare_parts_question:
        logger.info(
            "SPARE_PARSE part=%s drawing=%s chapter=%s pos=%s",
            spare_parsed.part_number,
            spare_parsed.drawing_number,
            spare_parsed.chapter,
            spare_parsed.position,
        )

    search_question = (
        spare_parsed.search_text
        or fault_parsed.search_text
        or question
    )
    embedding = await embedder.embed(search_question)

    # ── 1. Búsqueda principal en manuales técnicos ───────────────────────────
    sources = await pinecone.search(
        embedding, top_k=_RAG_TOP_K, namespace=_NS_TECNICO,
    )
    seen = {(s.document_name, s.page, s.chunk_index) for s in sources}

    def _merge(extra: list, boost: float = 0.0) -> None:
        for s in extra:
            key = (s.document_name, s.page, s.chunk_index)
            if key not in seen:
                seen.add(key)
                if boost:
                    s.score = round(s.score + boost, 4)
                sources.append(s)

    exact_md_hits = False
    code = fault_parsed.primary_code

    # ── 2. Búsqueda EXACTA + prioridad códigos de falla (3 subsistemas) ───────
    if fault_parsed.is_fault_question and not fault_parsed.is_ambiguous:
        exact_filter = _exact_fault_filter(fault_parsed)
        if exact_filter:
            if settings.environment == "development":
                logger.info("FAULT_FILTER exact=%s", exact_filter)

            exact = await pinecone.search(
                embedding, top_k=8, namespace=_NS_TECNICO, filter=exact_filter,
            )
            _log_fault_retrieval(fault_parsed, "exact-all", exact)
            for s in exact:
                s.score = 0.99
                if s.document_name.endswith(".md"):
                    exact_md_hits = True
            _merge(exact)

            # Búsqueda por subsistema probable (sin excluir otros sistemas).
            if code and not exact:
                for subsystem in infer_subsystem_hints(code):
                    sub_filter = _subsystem_fault_filter(code, subsystem)
                    sub_hits = await pinecone.search(
                        embedding, top_k=3, namespace=_NS_TECNICO, filter=sub_filter,
                    )
                    _log_fault_retrieval(fault_parsed, f"subsystem-{subsystem}", sub_hits)
                    for s in sub_hits:
                        s.score = 0.98
                        if s.document_name.endswith(".md"):
                            exact_md_hits = True
                    _merge(sub_hits)

        fault_emb = await embedder.embed(search_question)
        semantic_fault = await pinecone.search(
            fault_emb, top_k=15, namespace=_NS_TECNICO, filter=_FAULT_CODES_FILTER,
        )
        _log_fault_retrieval(fault_parsed, "semantic-fault_codes", semantic_fault)
        _merge(semantic_fault, boost=0.15)

        _merge(await pinecone.search(
            embedding, top_k=10, namespace=_NS_TECNICO, filter=_FAULT_CODES_FILTER,
        ), boost=0.10)

        # Fallback local: ficha exacta desde Markdown si Pinecone no la trajo.
        if code and not any(snippet_contains_code(s.snippet, code) for s in sources):
            local = buscar_codigo_falla(code)
            if local:
                if settings.environment == "development":
                    logger.info(
                        "FAULT_LOCAL_HIT code=%s doc=%s subsystem=%s",
                        code, local["document_name"], local["subsystem"],
                    )
                src = _entry_to_source(local)
                _merge([src])
                exact_md_hits = True
                structured_fault = (
                    f"{structured_fault}\n\n{formatear_contexto_falla(local)}"
                    if structured_fault
                    else formatear_contexto_falla(local)
                )

    # ── 2b. Manual de repuestos (doc_type = spare_parts) ─────────────────────
    if spare_parsed.is_spare_parts_question:
        if spare_parsed.part_number:
            part_filter = {
                "doc_type": {"$eq": "spare_parts"},
                "part_numbers": {"$in": [spare_parsed.part_number]},
            }
            exact_part = await pinecone.search(
                embedding, top_k=8, namespace=_NS_TECNICO, filter=part_filter,
            )
            for s in exact_part:
                s.score = 0.99
            _merge(exact_part)

        if spare_parsed.drawing_number:
            drawing_filter = {
                "doc_type": {"$eq": "spare_parts"},
                "drawing_number": {"$eq": spare_parsed.drawing_number},
            }
            exact_drawing = await pinecone.search(
                embedding, top_k=10, namespace=_NS_TECNICO, filter=drawing_filter,
            )
            for s in exact_drawing:
                s.score = 0.98
            _merge(exact_drawing)

        if spare_parsed.chapter:
            chapter_filter = {
                "doc_type": {"$eq": "spare_parts"},
                "chapter": {"$eq": spare_parsed.chapter},
            }
            _merge(await pinecone.search(
                embedding, top_k=8, namespace=_NS_TECNICO, filter=chapter_filter,
            ), boost=0.08)

        spare_emb = await embedder.embed(search_question)
        _merge(await pinecone.search(
            spare_emb, top_k=12, namespace=_NS_TECNICO, filter=_SPARE_PARTS_FILTER,
        ), boost=0.12)

        _merge(await pinecone.search(
            embedding, top_k=4, namespace=_NS_TECNICO, filter=_SPARE_INDEX_FILTER,
        ), boost=0.10)

        _merge(await pinecone.search(
            embedding, top_k=3, namespace=_NS_TECNICO, filter=_SPARE_INSTRUCTIONS_FILTER,
        ), boost=0.08)

        if spare_parsed.part_number and not any(
            snippet_contains_part_number(s.snippet, spare_parsed.part_number)
            for s in sources
        ):
            local = buscar_numero_parte(spare_parsed.part_number)
            if local:
                if settings.environment == "development":
                    logger.info(
                        "SPARE_LOCAL_HIT part=%s doc=%s drawing=%s",
                        spare_parsed.part_number,
                        local["document_name"],
                        local.get("drawing_number"),
                    )
                _merge([_entry_to_source(local)])
                structured_spare = formatear_contexto_repuesto(local)

        elif spare_parsed.drawing_number and not any(
            spare_parsed.drawing_number in (s.snippet or "") for s in sources
        ):
            local_drawings = buscar_dibujo(spare_parsed.drawing_number)
            if local_drawings:
                _merge([_entry_to_source(local_drawings[0])])
                structured_spare = formatear_contexto_repuesto(local_drawings[0])

    # ── 3. Reformulación con sinónimos técnicos ("marca" → "fabricante modelo")
    alt_text = _synonym_query(question)
    if alt_text:
        alt_emb = await embedder.embed(alt_text)
        _merge(await pinecone.search(
            alt_emb, top_k=_RAG_TOP_K // 2, namespace=_NS_TECNICO,
        ))

    # ── 4. Refuerzo cap7 para preguntas de lubricación/aceites ───────────────
    if _is_lubricacion_question(question):
        _merge(await pinecone.search(
            embedding,
            top_k=10,
            namespace=_NS_TECNICO,
            filter={
                "doc_type": {"$eq": "manual_lubrication"},
                "document_name": {"$eq": _LUB_DOC_MD},
            },
        ))

    # ── 5. Refuerzo cap9 para preguntas de especificaciones ──────────────────
    if _is_spec_question(question):
        _merge(await pinecone.search(
            embedding,
            top_k=10,
            namespace=_NS_TECNICO,
            filter={
                "doc_type": {"$eq": "manual_specs"},
                "document_name": {"$eq": _SPECS_DOC_MD},
            },
        ))

    # ── 6. Búsqueda en brochures comerciales (siempre) ───────────────────────
    _merge(await pinecone.search(
        embedding, top_k=_RAG_TOP_K_COMERCIAL, namespace=_NS_COMERCIAL,
    ))

    sources.sort(key=lambda x: x.score, reverse=True)

    # Excluir PDFs legacy cuando existen fichas Markdown equivalentes.
    if exact_md_hits:
        sources = [s for s in sources if not _is_legacy_fault_pdf(s.document_name)]
    sources = [s for s in sources if not _is_legacy_specs_pdf(s.document_name)]
    sources = [s for s in sources if not _is_legacy_lubricacion_pdf(s.document_name)]

    return sources[:_RAG_TOP_K], structured_fault, structured_spare


@router.post("", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    db      = SupabaseService()
    llm     = get_llm_provider()

    if settings.llm_provider == "mock":
        from app.services.llm.mock_provider import MOCK_SOURCES
        sources = MOCK_SOURCES
        structured = ""
    else:
        sources, fault_context, spare_context = await _retrieve_sources(payload.question)
        structured = "\n\n".join(p for p in (fault_context, spare_context) if p)

    answer = await llm.generate_response(payload.question, structured, sources)

    session_id = payload.session_id or db.create_session(user_id, payload.question[:80])
    db.save_message(session_id, user_id, "user", payload.question)
    db.save_message(session_id, user_id, "assistant", answer, sources)

    return ChatResponse(answer=answer, sources=sources, session_id=session_id)


@router.get("/history", response_model=List[dict])
async def get_history(current_user: dict = Depends(get_current_user)):
    return SupabaseService().get_user_sessions(current_user["id"])


@router.get("/sessions/{session_id}", response_model=List[dict])
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    return SupabaseService().get_session_messages(session_id, current_user["id"])
