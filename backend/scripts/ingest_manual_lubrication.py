#!/usr/bin/env python3
"""
Ingesta Capítulo 7 (lubricación) desde Markdown hacia Pinecone.

Reemplaza la ingesta del PDF cap7 para el agente. El PDF puede quedar en
Documentos; el chat usa el .md.

Uso:
    cd backend
    venv\\Scripts\\activate
    python scripts/ingest_manual_lubrication.py
    python scripts/ingest_manual_lubrication.py --purge-pdf
"""

import argparse
import asyncio
import re
import sys
import time
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.core.config import settings
from app.services.embeddings.openai_embeddings import OpenAIEmbeddingProvider
from app.services.manual_lubrication_service import (
    LUB_MD_FILENAME,
    LUB_PDF_FILENAME,
    LubricationChunk,
    ManualLubricationService,
    build_embedding_text,
    chunk_to_pinecone_metadata,
)

SPECS_DIR = Path(__file__).resolve().parent.parent / "documents" / "manuales" / "trs4531"
EMBED_BATCH = 50
PINECONE_BATCH = 100
RATE_WAIT = 1.0


def _safe_id(document_name: str) -> str:
    stem = Path(document_name).stem
    return re.sub(r"[^a-zA-Z0-9._-]", "-", stem)


def _build_vector(chunk: LubricationChunk, embedding: List[float]) -> dict:
    return {
        "id": f"lub-{_safe_id(chunk.document_name)}-s{chunk.section}-c{chunk.chunk_index}",
        "values": embedding,
        "metadata": chunk_to_pinecone_metadata(chunk),
    }


def _get_index():
    from pinecone import Pinecone
    return Pinecone(api_key=settings.pinecone_api_key).Index(settings.pinecone_index_name)


def purge_lubrication_pdf(namespace: str) -> None:
    index = _get_index()
    index.delete(
        filter={"document_name": {"$eq": LUB_PDF_FILENAME}},
        namespace=namespace,
    )
    print(f"  Eliminados vectores de: {LUB_PDF_FILENAME} (namespace {namespace})")


async def _embed_chunks(
    chunks: List[LubricationChunk],
    embedder: OpenAIEmbeddingProvider,
) -> List[dict]:
    vectors = []
    total = len(chunks)

    for i in range(0, total, EMBED_BATCH):
        batch = chunks[i : i + EMBED_BATCH]
        end_idx = min(i + EMBED_BATCH, total)
        print(f"      Embeddings {i + 1:>4}–{end_idx:>4} / {total}…")

        embeddings = await embedder.embed_batch([build_embedding_text(c) for c in batch])
        vectors.extend(_build_vector(c, emb) for c, emb in zip(batch, embeddings))

        if end_idx < total:
            time.sleep(RATE_WAIT)

    return vectors


def _upsert(vectors: List[dict], namespace: str) -> None:
    index = _get_index()
    total = len(vectors)

    for i in range(0, total, PINECONE_BATCH):
        batch = vectors[i : i + PINECONE_BATCH]
        end_idx = min(i + PINECONE_BATCH, total)
        print(f"      Pinecone upsert {i + 1:>4}–{end_idx:>4} / {total}…")
        index.upsert(vectors=batch, namespace=namespace)
        time.sleep(0.2)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Ingesta Cap. 7 lubricación (Markdown).")
    parser.add_argument("--namespace", default="trs4531")
    parser.add_argument("--purge-pdf", action="store_true")
    parser.add_argument("--purge-pdf-only", action="store_true")
    args = parser.parse_args()

    md_path = SPECS_DIR / LUB_MD_FILENAME
    namespace = args.namespace

    print("=" * 60)
    print("TECPORT AI — Ingesta Cap. 7 Lubricación (Markdown)")
    print("=" * 60)

    if args.purge_pdf_only:
        if not settings.pinecone_api_key:
            print("ERROR: PINECONE_API_KEY no configurado.")
            return
        purge_lubrication_pdf(namespace)
        return

    if not md_path.exists():
        print(f"ERROR: No existe {md_path}")
        return

    if not settings.openai_api_key or not settings.pinecone_api_key:
        print("ERROR: OPENAI_API_KEY y PINECONE_API_KEY requeridos.")
        return

    service = ManualLubricationService()
    embedder = OpenAIEmbeddingProvider()

    chunks, section_count = service.extract_chunks(md_path, LUB_MD_FILENAME)
    print(f"Archivo    : {md_path}")
    print(f"Secciones  : {section_count}  |  Chunks: {len(chunks)}")

    if not chunks:
        print("Sin contenido — abortando.")
        return

    vectors = await _embed_chunks(chunks, embedder)
    _upsert(vectors, namespace)

    if args.purge_pdf:
        print("\nPurga PDF cap7 en Pinecone…")
        purge_lubrication_pdf(namespace)

    print("\nLISTO — doc_type=manual_lubrication")
    if not args.purge_pdf:
        print("Recomendado: python scripts/ingest_manual_lubrication.py --purge-pdf")


if __name__ == "__main__":
    asyncio.run(main())
