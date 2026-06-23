from pydantic import BaseModel
from typing import Optional


class SourceItem(BaseModel):
    document_name: str
    page: int
    score: float
    snippet: str
    chunk_index: Optional[int] = None
    page_image_url: Optional[str] = None
    fault_code: Optional[str] = None
    system: Optional[str] = None
    subsystem: Optional[str] = None
