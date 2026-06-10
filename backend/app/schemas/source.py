from pydantic import BaseModel
from typing import Optional


class SourceItem(BaseModel):
    document_name: str
    page: int
    score: float
    snippet: str
    chunk_index: Optional[int] = None
    page_image_url: Optional[str] = None
