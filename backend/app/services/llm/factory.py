from app.core.config import settings
from app.services.llm.base import LLMProvider


def get_llm_provider() -> LLMProvider:
    if settings.llm_provider == "openai":
        from app.services.llm.openai_provider import OpenAILLMProvider
        return OpenAILLMProvider()
    from app.services.llm.mock_provider import MockLLMProvider
    return MockLLMProvider()
