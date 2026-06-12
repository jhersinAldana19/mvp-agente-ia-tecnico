from typing import List

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.security import get_current_user
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.source import SourceItem
from app.services.llm.factory import get_llm_provider
from app.services.supabase_service import SupabaseService

router = APIRouter()

_RAG_TOP_K            = 12
_RAG_TOP_K_COMERCIAL  = 4   # slots para brochures en cada consulta
_NS_TECNICO           = "trs4531"
_NS_COMERCIAL         = "trs4531-comercial"
_SPECS_DOC            = "cap9-especificaciones-trs4531 (1).pdf"

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

# Nombre exacto del documento de especificaciones en Pinecone
_SPECS_DOC = "cap9-especificaciones-trs4531 (1).pdf"


def _is_spec_question(question: str) -> bool:
    """True si la pregunta es sobre especificaciones técnicas del equipo."""
    q = question.lower()
    return sum(1 for w in _SPEC_WORDS if w in q) >= 2


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
    from app.services.pinecone_service import PineconeService

    embedder = get_embedding_provider()
    pinecone  = PineconeService()

    embedding = await embedder.embed(question)

    # ── 1. Búsqueda principal en manuales técnicos ───────────────────────────
    sources = await pinecone.search(
        embedding, top_k=_RAG_TOP_K, namespace=_NS_TECNICO,
    )
    seen = {(s.document_name, s.page, s.chunk_index) for s in sources}

    def _merge(extra: list) -> None:
        for s in extra:
            key = (s.document_name, s.page, s.chunk_index)
            if key not in seen:
                seen.add(key)
                sources.append(s)

    # ── 2. Reformulación con sinónimos técnicos ("marca" → "fabricante modelo")
    alt_text = _synonym_query(question)
    if alt_text:
        alt_emb = await embedder.embed(alt_text)
        _merge(await pinecone.search(
            alt_emb, top_k=_RAG_TOP_K // 2, namespace=_NS_TECNICO,
        ))

    # ── 3. Refuerzo cap9 para preguntas de especificaciones ──────────────────
    if _is_spec_question(question):
        _merge(await pinecone.search(
            embedding,
            top_k=8,
            namespace=_NS_TECNICO,
            filter={"document_name": {"$eq": _SPECS_DOC}},
        ))

    # ── 4. Búsqueda en brochures comerciales (siempre) ───────────────────────
    _merge(await pinecone.search(
        embedding, top_k=_RAG_TOP_K_COMERCIAL, namespace=_NS_COMERCIAL,
    ))

    sources.sort(key=lambda x: x.score, reverse=True)
    return sources[:_RAG_TOP_K], ""


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
        context = ""
    else:
        sources, context = await _retrieve_sources(payload.question)

    answer = await llm.generate_response(payload.question, context, sources)

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
