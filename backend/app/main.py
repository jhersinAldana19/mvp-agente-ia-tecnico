from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import health, auth, chat, admin, documents


def create_app() -> FastAPI:
    app = FastAPI(
        title="TECPORT AI Agent API",
        description="Backend para el Agente IA Técnico de TECPORT",
        version="0.1.0",
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, tags=["Health"])
    app.include_router(auth.router, prefix="/auth", tags=["Auth"])
    app.include_router(chat.router, prefix="/chat", tags=["Chat"])
    app.include_router(admin.router, prefix="/admin", tags=["Admin"])
    app.include_router(documents.router, prefix="/documents", tags=["Documents"])

    return app


app = create_app()
