#!/usr/bin/env python3
"""
Ingesta Biblioteca técnica (Markdown) hacia Pinecone.

Namespace: biblioteca-tecnica

Uso:
    cd backend
    venv\\Scripts\\activate

    python scripts/ingest_technical_library.py
    python scripts/ingest_technical_library.py --purge-pdf
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
from app.services.technical_library_service import (
    HYDRAULICS_MD_FILENAME,
    HYDRAULICS_PDF_FILENAME,
    TechnicalLibraryChunk,
    TechnicalLibraryService,
    build_embedding_text,
    chunk_to_pinecone_metadata,
)

DOC_DIR = Path(__file__).resolve().parent.parent / "documents" / "biblioteca-tecnica"
NS = "biblioteca-tecnica"
EMBED_BATCH = 50
PINECONE_BATCH = 100
RATE_WAIT = 1.0


def _safe_id(document_name: str) -> str:
    stem = Path(document_name).stem
    return re.sub(r"[^a-zA-Z0-9._-]", "-", stem)


def _build_vector(chunk: TechnicalLibraryChunk, embedding: List[float]) -> dict:
    return {
        "id": f"blib-{_safe_id(chunk.document_name)}-s{chunk.section}-c{chunk.chunk_index}",
        "values": embedding,
        "metadata": chunk_to_pinecone_metadata(chunk),
    }


def _get_index():
    from pinecone import Pinecone
    return Pinecone(api_key=settings.pinecone_api_key).Index(settings.pinecone_index_name)


def purge_hydraulics_pdf() -> None:
    index = _get_index()
    index.delete(
        filter={"document_name": {"$eq": HYDRAULICS_PDF_FILENAME}},
        namespace=NS,
    )
    print(f"  Eliminados vectores de: {HYDRAULICS_PDF_FILENAME} (namespace {NS})")


async def _embed_chunks(
    chunks: List[TechnicalLibraryChunk],
    embedder,
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


def _upsert(vectors: List[dict]) -> None:
    index = _get_index()
    total = len(vectors)

    for i in range(0, total, PINECONE_BATCH):
        batch = vectors[i : i + PINECONE_BATCH]
        end_idx = min(i + PINECONE_BATCH, total)
        print(f"      Pinecone upsert {i + 1:>4}–{end_idx:>4} / {total}…")
        index.upsert(vectors=batch, namespace=NS)
        time.sleep(0.2)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Ingesta Biblioteca técnica (.md).")
    parser.add_argument("--purge-pdf", action="store_true")
    parser.add_argument("--purge-pdf-only", action="store_true")
    args = parser.parse_args()

    md_path = DOC_DIR / HYDRAULICS_MD_FILENAME

    print("=" * 60)
    print("TECPORT AI — Ingesta Biblioteca Técnica (Markdown)")
    print("=" * 60)

    if args.purge_pdf_only:
        if not settings.pinecone_api_key:
            print("ERROR: PINECONE_API_KEY no configurado.")
            return
        purge_hydraulics_pdf()
        return

    if not md_path.exists():
        print(f"ERROR: No existe {md_path}")
        return

    if not settings.openai_api_key or not settings.pinecone_api_key:
        print("ERROR: OPENAI_API_KEY y PINECONE_API_KEY requeridos.")
        return

    from app.services.embeddings.openai_embeddings import OpenAIEmbeddingProvider

    service = TechnicalLibraryService()
    embedder = OpenAIEmbeddingProvider()

    chunks, section_count = service.extract_chunks(md_path, HYDRAULICS_MD_FILENAME)
    print(f"Archivo   : {md_path}")
    print(f"Namespace : {NS}")
    print(f"Secciones : {section_count}  |  Chunks: {len(chunks)}")

    if not chunks:
        print("Sin contenido — abortando.")
        return

    vectors = await _embed_chunks(chunks, embedder)
    _upsert(vectors)

    if args.purge_pdf:
        print("\nPurga PDF hidráulica en Pinecone (si existiera)…")
        purge_hydraulics_pdf()

    print("\nLISTO — doc_type=technical_library")
    if not args.purge_pdf:
        print("Recomendado: python scripts/ingest_technical_library.py --purge-pdf")


if __name__ == "__main__":
    asyncio.run(main())
