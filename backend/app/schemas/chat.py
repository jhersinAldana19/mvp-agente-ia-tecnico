from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.source import SourceItem


class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceItem]
    session_id: str


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    sources: Optional[List[SourceItem]] = None
    created_at: datetime


class ChatSessionSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    source_count: int = 0
