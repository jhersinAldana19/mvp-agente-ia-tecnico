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

    # Solo códigos de falla (doc_type=fault_codes):
    python scripts/test_search.py --fault-codes "Código de error 1607"

    # Namespace personalizado:
    python scripts/test_search.py --namespace trs4531 "código de falla 85.01"
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings
from app.services.embeddings.openai_embeddings import OpenAIEmbeddingProvider
from app.services.fault_code_parser import parse_fault_code_query
from app.services.pinecone_service import PineconeService

DEFAULT_QUERY = "¿Qué maniobras puedo hacer con el joystick del TRS4531?"
TOP_K         = 15
SNIPPET_CHARS = 280
FAULT_FILTER  = {"doc_type": {"$eq": "fault_codes"}}


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
    parser = argparse.ArgumentParser(description="Test de búsqueda semántica en Pinecone.")
    parser.add_argument("query", nargs="*", help="Consulta de búsqueda.")
    parser.add_argument("--namespace", default=None, help="Namespace Pinecone.")
    parser.add_argument(
        "--fault-codes",
        action="store_true",
        help="Filtrar solo doc_type=fault_codes.",
    )
    args = parser.parse_args()

    query = " ".join(args.query).strip() if args.query else DEFAULT_QUERY
    namespace = args.namespace or settings.pinecone_namespace
    parsed = parse_fault_code_query(query)
    search_text = parsed.search_text or query
    metadata_filter = FAULT_FILTER if args.fault_codes else None
    if args.fault_codes and parsed.primary_code:
        metadata_filter = {
            "doc_type": {"$eq": "fault_codes"},
            "fault_code": {"$eq": parsed.primary_code},
        }
    elif args.fault_codes and parsed.spn and parsed.fmi:
        metadata_filter = {
            "doc_type": {"$eq": "fault_codes"},
            "spn": {"$eq": parsed.spn},
            "fmi": {"$eq": parsed.fmi},
        }

    print("=" * 60)
    print("TECPORT AI — Test de Búsqueda Semántica")
    print("=" * 60)
    print(f"Consulta : {query}")
    if search_text != query:
        print(f"Búsqueda : {search_text}")
    if parsed.is_fault_question:
        print(f"Tipo     : consulta de código de falla"
              f"{' (ambigua)' if parsed.is_ambiguous else ''}")
    print(f"Índice   : {settings.pinecone_index_name}/{namespace}")
    if metadata_filter:
        print(f"Filtro   : {metadata_filter}")
    print(f"Top-K    : {TOP_K}")
    print("-" * 60)

    if not _check_config():
        return

    print("\nGenerando embedding de la consulta…")
    embedding = await OpenAIEmbeddingProvider().embed(search_text)

    print("Buscando en Pinecone…\n")
    results = await PineconeService().search(
        embedding,
        top_k=TOP_K,
        namespace=namespace,
        filter=metadata_filter,
    )

    if not results:
        print("Sin resultados.")
        print("\n¿Se ejecutó la ingesta?")
        print("  Manuales PDF  →  python scripts/ingest_pdfs.py --dir manuales/trs4531 --namespace trs4531")
        print("  Códigos falla →  python scripts/ingest_markdown.py")
        return

    for i, r in enumerate(results, 1):
        snippet = r.snippet.replace("\n", " ")[:SNIPPET_CHARS]
        print(f"[{i}] {r.document_name}")
        print(f"     Sección: {r.page}")
        print(f"     Score  : {r.score:.4f}")
        print(f"     Snippet: {snippet}…")
        print()

    print(f"{'─' * 60}")
    print(f"Búsqueda completada — {len(results)} resultado(s) encontrado(s).")


if __name__ == "__main__":
    asyncio.run(main())
