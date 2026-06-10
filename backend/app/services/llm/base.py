from abc import ABC, abstractmethod
from typing import List

from app.schemas.source import SourceItem


class LLMProvider(ABC):
    @abstractmethod
    async def generate_response(
        self, question: str, context: str, sources: List[SourceItem]
    ) -> str: ...
