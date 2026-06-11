#!/usr/bin/env python3
"""
Test de búsqueda semántica en Pinecone.

Verifica que la ingesta fue exitosa y que el RAG devuelve resultados relevantes.

Uso:
    cd backend
    venv\\Scripts\\activate

    # Consulta por defecto:
    python scripts/test_search.py

    # Consulta personalizada:
    python scripts/test_search.py ¿Cómo realizar el mantenimiento diario?
    python scripts/test_search.py "¿Cuál es la capacidad de carga máxima?"
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings
from app.services.embeddings.openai_embeddings import OpenAIEmbeddingProvider
from app.services.pinecone_service import PineconeService


DEFAULT_QUERY = "¿Qué maniobras puedo hacer con el joystick del TRS4531?"
TOP_K         = 15
SNIPPET_CHARS = 280


def _check_config() -> bool:
    ok = True
    if not settings.openai_api_key:
        print("ERROR: OPENAI_API_KEY no configurado en .env")
        ok = False
    if not settings.pinecone_api_key:
        print("ERROR: PINECONE_API_KEY no configurado en .env")
        ok = False
    return ok


async def main() -> None:
    query = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else DEFAULT_QUERY

    print("=" * 60)
    print("TECPORT AI — Test de Búsqueda Semántica")
    print("=" * 60)
    print(f"Consulta : {query}")
    print(f"Índice   : {settings.pinecone_index_name}/{settings.pinecone_namespace}")
    print(f"Top-K    : {TOP_K}")
    print("-" * 60)

    if not _check_config():
        return

    print("\nGenerando embedding de la consulta…")
    embedding = await OpenAIEmbeddingProvider().embed(query)

    print("Buscando en Pinecone…\n")
    results = await PineconeService().search(embedding, top_k=TOP_K)

    if not results:
        print("Sin resultados.")
        print("\n¿Se ejecutó la ingesta?  →  python scripts/ingest_pdfs.py")
        return

    for i, r in enumerate(results, 1):
        snippet = r.snippet.replace("\n", " ")[:SNIPPET_CHARS]
        print(f"[{i}] {r.document_name}")
        print(f"     Página : {r.page}")
        print(f"     Score  : {r.score:.4f}")
        print(f"     Snippet: {snippet}…")
        print()

    print(f"{'─' * 60}")
    print(f"Búsqueda completada — {len(results)} resultado(s) encontrado(s).")


if __name__ == "__main__":
    asyncio.run(main())
