from typing import List

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.security import get_current_user
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.source import SourceItem
from app.services.llm.factory import get_llm_provider
from app.services.supabase_service import SupabaseService

router = APIRouter()

_RAG_TOP_K = 8


async def _retrieve_sources(question: str) -> tuple[List[SourceItem], str]:
    """Genera embedding, busca en Pinecone y construye el contexto para el LLM."""
    from app.services.embeddings.factory import get_embedding_provider
    from app.services.pinecone_service import PineconeService

    embedding = await get_embedding_provider().embed(question)
    sources   = await PineconeService().search(embedding, top_k=_RAG_TOP_K)

    # El contexto estructurado lo construye OpenAILLMProvider internamente.
    # Aquí solo lo pasamos vacío; el provider usa `sources` directamente.
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
