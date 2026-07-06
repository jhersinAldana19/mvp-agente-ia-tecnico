#!/usr/bin/env python3
"""
Ingesta Capítulo 9 (especificaciones) desde Markdown hacia Pinecone.

Reemplaza la ingesta del PDF cap9 para tablas técnicas — el PDF puede quedar
solo para la página Documentos; el agente usa el .md.

Uso:
    cd backend
    venv\\Scripts\\activate

    # 1. Colocar el .md en:
    #    documents/manuales/trs4531/cap9-especificaciones-trs4531.md

    # 2. Ingestar Markdown:
    python scripts/ingest_manual_specs.py

    # 3. Eliminar vectores viejos del PDF cap9 (recomendado):
    python scripts/ingest_manual_specs.py --purge-pdf
"""

import argparse
import asyncio
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.core.config import settings
from app.services.embeddings.openai_embeddings import OpenAIEmbeddingProvider
from app.services.manual_specs_service import (
    SPECS_MD_FILENAME,
    SPECS_PDF_FILENAME,
    ManualSpecsService,
    SpecsChunk,
    build_embedding_text,
    chunk_to_pinecone_metadata,
)

DOCUMENTS_DIR = Path(__file__).resolve().parent.parent / "documents"
SPECS_DIR = DOCUMENTS_DIR / "manuales" / "trs4531"
EMBED_BATCH = 50
PINECONE_BATCH = 100
RATE_WAIT = 1.0


@dataclass
class DocumentResult:
    document_name: str
    sections: int = 0
    chunks: int = 0
    error: str = ""

    @property
    def ok(self) -> bool:
        return not self.error


def _safe_id(document_name: str) -> str:
    stem = Path(document_name).stem
    return re.sub(r"[^a-zA-Z0-9._-]", "-", stem)


def _build_vector(chunk: SpecsChunk, embedding: List[float]) -> dict:
    return {
        "id": f"spec-{_safe_id(chunk.document_name)}-s{chunk.section}-c{chunk.chunk_index}",
        "values": embedding,
        "metadata": chunk_to_pinecone_metadata(chunk),
    }


def _get_index():
    from pinecone import Pinecone
    return Pinecone(api_key=settings.pinecone_api_key).Index(settings.pinecone_index_name)


def purge_specs_pdf(namespace: str) -> int:
    """Elimina vectores del PDF cap9 en Pinecone (evita duplicar con el .md)."""
    index = _get_index()
    # Pinecone delete by metadata filter — no devuelve count en todas las versiones
    index.delete(
        filter={"document_name": {"$eq": SPECS_PDF_FILENAME}},
        namespace=namespace,
    )
    print(f"  Eliminados vectores de: {SPECS_PDF_FILENAME} (namespace {namespace})")
    return 0


async def _embed_chunks(
    chunks: List[SpecsChunk],
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
    parser = argparse.ArgumentParser(description="Ingesta Cap. 9 especificaciones (Markdown).")
    parser.add_argument("--namespace", default="trs4531", help="Namespace Pinecone.")
    parser.add_argument(
        "--purge-pdf",
        action="store_true",
        help="Elimina vectores del PDF cap9 después de ingestar el .md.",
    )
    parser.add_argument(
        "--purge-pdf-only",
        action="store_true",
        help="Solo elimina vectores del PDF cap9 (sin re-ingestar).",
    )
    args = parser.parse_args()

    md_path = SPECS_DIR / SPECS_MD_FILENAME
    namespace = args.namespace

    print("=" * 60)
    print("TECPORT AI — Ingesta Cap. 9 Especificaciones (Markdown)")
    print("=" * 60)

    if args.purge_pdf_only:
        if not settings.pinecone_api_key:
            print("ERROR: PINECONE_API_KEY no configurado.")
            return
        purge_specs_pdf(namespace)
        return

    if not md_path.exists():
        print(f"ERROR: No existe {md_path}")
        print("\nCopia tu archivo desde Downloads:")
        print(f"  Capitulo_9_Especificaciones.md  →  {SPECS_MD_FILENAME}")
        return

    if not settings.openai_api_key or not settings.pinecone_api_key:
        print("ERROR: OPENAI_API_KEY y PINECONE_API_KEY requeridos en .env")
        return

    print(f"Archivo    : {md_path}")
    print(f"Namespace  : {namespace}")
    print(f"Índice     : {settings.pinecone_index_name}")
    print("-" * 60)

    service = ManualSpecsService()
    embedder = OpenAIEmbeddingProvider()

    print("Extrayendo secciones…")
    chunks, section_count = service.extract_chunks(md_path, SPECS_MD_FILENAME)
    print(f"Secciones: {section_count}  |  Chunks: {len(chunks)}")

    if not chunks:
        print("Sin contenido — abortando.")
        return

    vectors = await _embed_chunks(chunks, embedder)
    _upsert(vectors, namespace)

    if args.purge_pdf:
        print("\nPurga PDF cap9 en Pinecone…")
        purge_specs_pdf(namespace)

    print("\n" + "=" * 60)
    print("LISTO")
    print(f"  chunks subidos : {len(chunks)}")
    print(f"  doc_type       : manual_specs")
    print(f"  document_name  : {SPECS_MD_FILENAME}")
    if not args.purge_pdf:
        print("\n  Recomendado: python scripts/ingest_manual_specs.py --purge-pdf")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
