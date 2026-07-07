#!/usr/bin/env python3
"""
Ingesta brochure técnico comercial TRS4531 desde Markdown hacia Pinecone.

Namespace: trs4531-comercial (mismo que brochures PDF).

Uso:
    cd backend
    venv\\Scripts\\activate

    # Colocar .md en documents/comercial/trs4531/TRS4531_Brochure_Tecnico_ESP.md
    python scripts/ingest_commercial_brochure.py
    python scripts/ingest_commercial_brochure.py --purge-pdf
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
from app.services.commercial_brochure_service import (
    BROCHURE_TEC_MD_FILENAME,
    BROCHURE_TEC_PDF_FILENAME,
    CommercialBrochureChunk,
    CommercialBrochureService,
    build_embedding_text,
    chunk_to_pinecone_metadata,
)

DOC_DIR = Path(__file__).resolve().parent.parent / "documents" / "comercial" / "trs4531"
NS = "trs4531-comercial"
EMBED_BATCH = 50
PINECONE_BATCH = 100
RATE_WAIT = 1.0


def _safe_id(document_name: str) -> str:
    stem = Path(document_name).stem
    return re.sub(r"[^a-zA-Z0-9._-]", "-", stem)


def _build_vector(chunk: CommercialBrochureChunk, embedding: List[float]) -> dict:
    return {
        "id": f"comtec-{_safe_id(chunk.document_name)}-s{chunk.section}-c{chunk.chunk_index}",
        "values": embedding,
        "metadata": chunk_to_pinecone_metadata(chunk),
    }


def _get_index():
    from pinecone import Pinecone
    return Pinecone(api_key=settings.pinecone_api_key).Index(settings.pinecone_index_name)


def purge_brochure_tec_pdf() -> None:
    index = _get_index()
    index.delete(
        filter={"document_name": {"$eq": BROCHURE_TEC_PDF_FILENAME}},
        namespace=NS,
    )
    print(f"  Eliminados vectores de: {BROCHURE_TEC_PDF_FILENAME} (namespace {NS})")


async def _embed_chunks(
    chunks: List[CommercialBrochureChunk],
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
    parser = argparse.ArgumentParser(description="Ingesta brochure técnico comercial (.md).")
    parser.add_argument("--purge-pdf", action="store_true")
    parser.add_argument("--purge-pdf-only", action="store_true")
    args = parser.parse_args()

    md_path = DOC_DIR / BROCHURE_TEC_MD_FILENAME

    print("=" * 60)
    print("TECPORT AI — Ingesta Brochure Técnico Comercial (Markdown)")
    print("=" * 60)

    if args.purge_pdf_only:
        if not settings.pinecone_api_key:
            print("ERROR: PINECONE_API_KEY no configurado.")
            return
        purge_brochure_tec_pdf()
        return

    if not md_path.exists():
        print(f"ERROR: No existe {md_path}")
        return

    if not settings.openai_api_key or not settings.pinecone_api_key:
        print("ERROR: OPENAI_API_KEY y PINECONE_API_KEY requeridos.")
        return

    from app.services.embeddings.openai_embeddings import OpenAIEmbeddingProvider

    service = CommercialBrochureService()
    embedder = OpenAIEmbeddingProvider()

    chunks, section_count = service.extract_chunks(md_path, BROCHURE_TEC_MD_FILENAME)
    print(f"Archivo   : {md_path}")
    print(f"Namespace : {NS}")
    print(f"Secciones : {section_count}  |  Chunks: {len(chunks)}")

    if not chunks:
        print("Sin contenido — abortando.")
        return

    vectors = await _embed_chunks(chunks, embedder)
    _upsert(vectors)

    if args.purge_pdf:
        print("\nPurga PDF brochure técnico en Pinecone…")
        purge_brochure_tec_pdf()

    print("\nLISTO — doc_type=commercial_technical")
    if not args.purge_pdf:
        print("Recomendado: python scripts/ingest_commercial_brochure.py --purge-pdf")


if __name__ == "__main__":
    asyncio.run(main())
