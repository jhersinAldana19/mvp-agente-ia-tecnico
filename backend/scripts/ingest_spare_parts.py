#!/usr/bin/env python3
"""
Pipeline de ingesta del manual de repuestos TRS4531 hacia Pinecone.

Flujo:
    backend/documents/manuales-de-repuestos/trs4531/*.md
    → chunking por dibujo (## Dibujo XX.XXX)
    → embeddings en batches (OpenAI text-embedding-3-small)
    → upsert en Pinecone (namespace trs4531, doc_type=spare_parts)

Uso:
    cd backend
    venv\\Scripts\\activate
    python scripts/ingest_spare_parts.py
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
from app.services.spare_parts_service import (
    SparePartsChunk,
    SparePartsService,
    build_embedding_text,
    chunk_to_pinecone_metadata,
)

DOCUMENTS_DIR = Path(__file__).resolve().parent.parent / "documents"
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


def _build_vector(chunk: SparePartsChunk, embedding: List[float]) -> dict:
    metadata = chunk_to_pinecone_metadata(chunk)
    return {
        "id": (
            f"sp-{_safe_id(chunk.document_name)}"
            f"-s{chunk.section}-c{chunk.chunk_index}"
        ),
        "values": embedding,
        "metadata": metadata,
    }


async def _embed_chunks(
    chunks: List[SparePartsChunk],
    embedder: OpenAIEmbeddingProvider,
) -> List[dict]:
    vectors = []
    total = len(chunks)

    for i in range(0, total, EMBED_BATCH):
        batch = chunks[i : i + EMBED_BATCH]
        end_idx = min(i + EMBED_BATCH, total)
        print(f"      Embeddings {i + 1:>4}–{end_idx:>4} / {total}…")

        embeddings = await embedder.embed_batch(
            [build_embedding_text(c) for c in batch]
        )
        vectors.extend(_build_vector(c, emb) for c, emb in zip(batch, embeddings))

        if end_idx < total:
            time.sleep(RATE_WAIT)

    return vectors


def _upsert(vectors: List[dict], namespace: str) -> None:
    from pinecone import Pinecone

    index = Pinecone(api_key=settings.pinecone_api_key).Index(settings.pinecone_index_name)
    total = len(vectors)

    for i in range(0, total, PINECONE_BATCH):
        batch = vectors[i : i + PINECONE_BATCH]
        end_idx = min(i + PINECONE_BATCH, total)
        print(f"      Pinecone upsert {i + 1:>4}–{end_idx:>4} / {total}…")
        index.upsert(vectors=batch, namespace=namespace)
        time.sleep(0.2)


async def process_markdown(
    md_path: Path,
    embedder: OpenAIEmbeddingProvider,
    service: SparePartsService,
    namespace: str,
) -> DocumentResult:
    result = DocumentResult(document_name=md_path.name)
    try:
        print("    Extrayendo dibujos/secciones…")
        chunks, section_count = service.extract_chunks(md_path, md_path.name)
        result.sections = section_count
        result.chunks = len(chunks)
        print(f"    Secciones: {section_count}  |  Chunks: {len(chunks)}")

        if not chunks:
            print("    Sin contenido — se omite.")
            return result

        vectors = await _embed_chunks(chunks, embedder)
        _upsert(vectors, namespace)

    except Exception as exc:
        result.error = str(exc)
        print(f"    ERROR: {exc}")

    return result


def _check_config() -> bool:
    errors = []
    if not settings.openai_api_key:
        errors.append("OPENAI_API_KEY")
    if not settings.pinecone_api_key:
        errors.append("PINECONE_API_KEY")
    if errors:
        for key in errors:
            print(f"  ERROR: {key} no configurado en .env")
        return False
    return True


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingesta Markdown del manual de repuestos TRS4531 hacia Pinecone."
    )
    parser.add_argument(
        "--dir",
        default="manuales-de-repuestos/trs4531",
        help="Subdirectorio dentro de backend/documents/.",
    )
    parser.add_argument(
        "--namespace",
        default="trs4531",
        help="Namespace de Pinecone (default: trs4531).",
    )
    args = parser.parse_args()

    target_dir = DOCUMENTS_DIR / args.dir
    namespace = args.namespace

    print("=" * 60)
    print("TECPORT AI — Ingesta Manual de Repuestos TRS4531")
    print("=" * 60)

    if not target_dir.exists():
        print(f"ERROR: El directorio no existe: {target_dir}")
        print("\nCopia los .md desde Google Drive a:")
        print("  rag-archivos-trs4531/MANUALES DE REPUESTOS/TRS4531/")
        print(f"  → {target_dir}")
        return

    md_files = sorted(target_dir.glob("*.md"))

    print(f"Directorio      : {target_dir}")
    print(f"Namespace       : {namespace}")
    print(f"MDs encontrados : {len(md_files)}\n")

    if not md_files:
        print("No se encontraron archivos .md en ese directorio.")
        return

    for i, f in enumerate(md_files, 1):
        size_kb = f.stat().st_size / 1024
        print(f"  {i}. {f.name:<55} {size_kb:>7.0f} KB")

    print()
    if not _check_config():
        return

    print(f"Índice   : {settings.pinecone_index_name}")
    print(f"Namespace: {namespace}")
    print(f"Modelo   : {settings.openai_embedding_model}")
    print("-" * 60)

    embedder = OpenAIEmbeddingProvider()
    service = SparePartsService()
    results: List[DocumentResult] = []

    for idx, md_path in enumerate(md_files, 1):
        print(f"\n[{idx}/{len(md_files)}] {md_path.name}")
        result = await process_markdown(md_path, embedder, service, namespace)
        results.append(result)

    ok_list = [r for r in results if r.ok]
    fail_list = [r for r in results if not r.ok]

    print("\n" + "=" * 60)
    print("RESUMEN FINAL")
    print("=" * 60)
    print(f"  Directorio           : {target_dir}")
    print(f"  Namespace Pinecone   : {namespace}")
    print(f"  total_documents      : {len(results)}")
    print(f"  exitosos             : {len(ok_list)}")
    print(f"  con error            : {len(fail_list)}")
    print(f"  total_secciones      : {sum(r.sections for r in ok_list)}")
    print(f"  total_chunks_uploaded: {sum(r.chunks for r in ok_list)}")

    if ok_list:
        print("\n  Detalle por documento:")
        for r in ok_list:
            print(
                f"    ✓  {r.document_name:<52}  {r.sections:>4} secc.  {r.chunks:>5} chunks"
            )

    if fail_list:
        print("\n  Con errores:")
        for r in fail_list:
            print(f"    ✗  {r.document_name}")
            print(f"       {r.error}")

    print()


if __name__ == "__main__":
    asyncio.run(main())
