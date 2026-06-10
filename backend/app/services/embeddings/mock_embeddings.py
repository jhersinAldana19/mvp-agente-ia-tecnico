import random
from typing import List

from app.services.embeddings.base import EmbeddingProvider

_DIMENSION = 1536


class MockEmbeddingProvider(EmbeddingProvider):
    async def embed(self, text: str) -> List[float]:
        return [random.uniform(-1.0, 1.0) for _ in range(_DIMENSION)]

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [await self.embed(t) for t in texts]
