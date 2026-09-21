from typing import List

from pydantic import BaseModel, Field

from app.schemas.source import SourceItem


class RagQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)


class RagQueryResponse(BaseModel):
    """Mismos fragmentos que usa SOFIA antes de generar la respuesta con LLM."""
    sources: List[SourceItem]
    structured_context: str = ""
