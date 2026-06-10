from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""

    # Pinecone
    pinecone_api_key: str = ""
    pinecone_index_name: str = "tecport-ai-agent-rag"
    pinecone_namespace: str = "trs4531"

    # OpenAI
    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4.1-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    # Google Drive
    google_drive_folder_name: str = "rag-archivos-trs4531"
    google_client_id: str = ""
    google_client_secret: str = ""

    # Providers: "mock" | "openai"
    llm_provider: str = "mock"
    embedding_provider: str = "mock"

    # App
    frontend_url: str = "http://localhost:5173"
    environment: str = "development"

    @property
    def allowed_origins(self) -> List[str]:
        return list({self.frontend_url, "http://localhost:5173", "http://localhost:3000"})


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
