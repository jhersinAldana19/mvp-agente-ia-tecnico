"""Pinecone service — búsqueda semántica para RAG."""
from typing import List

from app.core.config import settings
from app.schemas.source import SourceItem

_DEFAULT_TOP_K = 5


class PineconeService:
    def _index(self):
        from pinecone import Pinecone
        return Pinecone(api_key=settings.pinecone_api_key).Index(settings.pinecone_index_name)

    async def search(
        self,
        embedding: List[float],
        top_k: int = _DEFAULT_TOP_K,
        filter: dict | None = None,
        namespace: str | None = None,
    ) -> List[SourceItem]:
        kwargs: dict = dict(
            namespace=namespace or settings.pinecone_namespace,
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
        )
        if filter:
            kwargs["filter"] = filter
        results = self._index().query(**kwargs)
        return [
            SourceItem(
                document_name=m.metadata.get("document_name", ""),
                page=int(m.metadata.get("page", 0)),
                score=round(m.score, 4),
                snippet=m.metadata.get("snippet", ""),
                chunk_index=m.metadata.get("chunk_index"),
                page_image_url=m.metadata.get("page_image_url"),
            )
            for m in results.matches
        ]

    async def upsert(self, vectors: List[dict]) -> None:
        """Upsert vectores en Pinecone. Usado por el pipeline de ingestión."""
        self._index().upsert(vectors=vectors, namespace=settings.pinecone_namespace)
