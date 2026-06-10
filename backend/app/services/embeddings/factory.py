from app.core.config import settings
from app.services.embeddings.base import EmbeddingProvider


def get_embedding_provider() -> EmbeddingProvider:
    if settings.embedding_provider == "openai":
        from app.services.embeddings.openai_embeddings import OpenAIEmbeddingProvider
        return OpenAIEmbeddingProvider()
    from app.services.embeddings.mock_embeddings import MockEmbeddingProvider
    return MockEmbeddingProvider()
