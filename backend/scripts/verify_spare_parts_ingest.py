#!/usr/bin/env python3
"""Verifica ingesta del manual de repuestos en Pinecone."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from pinecone import Pinecone

from app.core.config import settings
from app.services.embeddings.openai_embeddings import OpenAIEmbeddingProvider
from app.services.spare_parts_service import SparePartsService

DOC_DIR = Path(__file__).resolve().parent.parent / "documents" / "manuales-de-repuestos" / "trs4531"
EXPECTED_PREFIX = "sp-"


def local_summary() -> tuple[int, int, int]:
    service = SparePartsService()
    files = sorted(DOC_DIR.glob("*.md"))
    sections = chunks = 0
    for path in files:
        c, n = service.extract_chunks(path, path.name)
        sections += n
        chunks += len(c)
    return len(files), sections, chunks


def pinecone_spare_count(index) -> int:
    count = 0
    for batch in index.list(prefix=EXPECTED_PREFIX, namespace=settings.pinecone_namespace):
        if isinstance(batch, list):
            count += len(batch)
        else:
            count += 1
    return count


async def sample_queries(index) -> None:
    embedder = OpenAIEmbeddingProvider()

    q1 = await embedder.embed("repuesto bomba de freno dibujo 08.001 TRS4531")
    r1 = index.query(
        vector=q1,
        top_k=3,
        namespace=settings.pinecone_namespace,
        filter={"doc_type": {"$eq": "spare_parts"}},
        include_metadata=True,
    )
    print(f"  Query repuestos (08.001): {len(r1.matches)} hits")
    for m in r1.matches:
        md = m.metadata
        print(
            f"    score={m.score:.3f} doc={md.get('document_name')} "
            f"drawing={md.get('drawing_number')} subtype={md.get('document_subtype')}"
        )

    q2 = await embedder.embed("capítulo sistema hidráulico manual repuestos TRS4531")
    r2 = index.query(
        vector=q2,
        top_k=2,
        namespace=settings.pinecone_namespace,
        filter={"document_subtype": {"$eq": "indice_general_manual_repuestos"}},
        include_metadata=True,
    )
    print(f"  Query índice repuestos: {len(r2.matches)} hits")
    for m in r2.matches:
        print(f"    score={m.score:.3f} doc={m.metadata.get('document_name')}")


async def main() -> None:
    print("=" * 60)
    print("VERIFICACIÓN — Manual de repuestos TRS4531")
    print("=" * 60)

    local_files, local_sections, local_chunks = local_summary()
    print(f"\nLOCAL  -> {local_files} archivos | {local_sections} secciones | {local_chunks} chunks")

    if not settings.pinecone_api_key:
        print("\nERROR: PINECONE_API_KEY no configurada.")
        return

    index = Pinecone(api_key=settings.pinecone_api_key).Index(settings.pinecone_index_name)
    stats = index.describe_index_stats()
    ns_stats = stats.get("namespaces", {}).get(settings.pinecone_namespace, {})
    ns_total = ns_stats.get("vector_count", 0)

    spare_count = pinecone_spare_count(index)
    print(f"PINECONE -> namespace '{settings.pinecone_namespace}' total vectores: {ns_total}")
    print(f"PINECONE -> vectores spare_parts (prefijo sp-): {spare_count}")

    if spare_count == local_chunks:
        print("\nOK COINCIDE: chunks locales = vectores spare_parts en Pinecone")
    else:
        print(f"\nDIFERENCIA: local={local_chunks} vs pinecone sp-={spare_count}")
        print("  (Si re-ingestaste, puede haber vectores antiguos extra en el namespace.)")

    print("\nPruebas semánticas:")
    await sample_queries(index)
    print()


if __name__ == "__main__":
    asyncio.run(main())
