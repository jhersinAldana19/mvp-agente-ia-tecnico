from typing import List

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.security import get_current_user
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.source import SourceItem
from app.services.llm.factory import get_llm_provider
from app.services.supabase_service import SupabaseService

router = APIRouter()

_RAG_TOP_K = 12

# Términos coloquiales del usuario → equivalentes técnicos usados en los documentos.
# Permite recuperar chunks que usan "fabricante" aunque el usuario escriba "marca".
_SYNONYM_MAP = {
    "marca":         "fabricante modelo",
    "quién fabrica": "fabricante",
    "quien fabrica": "fabricante",
    "fabricado por": "fabricante",
    "hecho por":     "fabricante",
    "proveedor":     "fabricante proveedor",
}


def _alt_query(question: str) -> str | None:
    """Devuelve una reformulación técnica de la pregunta, o None si no aplica."""
    q = question.lower()
    for colloquial, technical in _SYNONYM_MAP.items():
        if colloquial in q:
            return q.replace(colloquial, technical)
    return None


async def _retrieve_sources(question: str) -> tuple[List[SourceItem], str]:
    """Genera embeddings, busca en Pinecone con dual-query y devuelve top sources."""
    from app.services.embeddings.factory import get_embedding_provider
    from app.services.pinecone_service import PineconeService

    embedder = get_embedding_provider()
    pinecone  = PineconeService()

    # Búsqueda primaria con la pregunta original
    embedding = await embedder.embed(question)
    sources   = await pinecone.search(embedding, top_k=_RAG_TOP_K)

    # Búsqueda secundaria con terminología técnica del documento (si aplica)
    alt = _alt_query(question)
    if alt:
        alt_embedding = await embedder.embed(alt)
        alt_sources   = await pinecone.search(alt_embedding, top_k=_RAG_TOP_K // 2)
        # Deduplicar por (document_name, page, chunk_index)
        seen = {(s.document_name, s.page, s.chunk_index) for s in sources}
        for s in alt_sources:
            key = (s.document_name, s.page, s.chunk_index)
            if key not in seen:
                seen.add(key)
                sources.append(s)
        sources.sort(key=lambda x: x.score, reverse=True)
        sources = sources[:_RAG_TOP_K]

    return sources, ""


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
