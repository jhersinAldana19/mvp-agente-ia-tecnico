"""Consulta RAG (solo recuperación de documentos, sin LLM)."""
from fastapi import APIRouter, Depends

from app.api.routes.chat import _retrieve_sources
from app.core.security import get_current_user
from app.schemas.rag import RagQueryRequest, RagQueryResponse

router = APIRouter()


@router.post("/query", response_model=RagQueryResponse)
async def rag_query(
    payload: RagQueryRequest,
    _user: dict = Depends(get_current_user),
):
    """
    Ejecuta la misma búsqueda RAG que el chat SOFIA y devuelve fuentes + contexto estructurado.
    Requiere Authorization: Bearer <JWT Supabase> (mismo login que la web).
    """
    sources, fault_ctx, spare_ctx = await _retrieve_sources(payload.question)
    structured = "\n\n".join(p for p in (fault_ctx, spare_ctx) if p)
    return RagQueryResponse(sources=sources, structured_context=structured)
