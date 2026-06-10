#!/usr/bin/env python3
"""
Pipeline de ingesta de PDFs hacia Pinecone.

Flujo:
    backend/documents/*.pdf
    → extracción de texto por página (PyMuPDF)
    → chunks con solapamiento
    → embeddings en batches (OpenAI text-embedding-3-small)
    → upsert en batches (Pinecone tecport-ai-agent-rag / trs4531)

Uso:
    cd backend
    venv\\Scripts\\activate
    python scripts/ingest_pdfs.py

Notas:
    - Procesa TODOS los PDFs en backend/documents/.
    - Si un PDF falla, muestra el error y continúa con los demás.
    - Los IDs en Pinecone siguen el formato: {stem}-p{page}-c{chunk_index}
    - El campo "snippet" en metadata es compatible con PineconeService.search().
"""

import asyncio
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

# ── Permite importar desde app/ sin instalar el paquete ──────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings
from app.services.embeddings.openai_embeddings import OpenAIEmbeddingProvider
from app.services.pdf_service import PdfChunk, PdfService


# ─── Constantes ──────────────────────────────────────────────────────────────

DOCUMENTS_DIR  = Path(__file__).resolve().parent.parent / "documents"
EMBED_BATCH    = 50    # textos por llamada a OpenAI Embeddings
PINECONE_BATCH = 100   # vectores por llamada a Pinecone upsert
RATE_WAIT      = 1.0   # seg. entre batches de embeddings (rate limits OpenAI)


# ─── Resultado por documento ─────────────────────────────────────────────────

@dataclass
class DocumentResult:
    document_name: str
    pages: int = 0
    chunks: int = 0
    error: str = ""

    @property
    def ok(self) -> bool:
        return not self.error


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _safe_id(document_name: str) -> str:
    """Convierte el nombre del archivo en un ID seguro para Pinecone."""
    stem = Path(document_name).stem
    return re.sub(r"[^a-zA-Z0-9._-]", "-", stem)


def _build_vector(chunk: PdfChunk, embedding: List[float]) -> dict:
    return {
        "id": f"{_safe_id(chunk.document_name)}-p{chunk.page}-c{chunk.chunk_index}",
        "values": embedding,
        "metadata": {
            "document_name": chunk.document_name,
            "page":          chunk.page,
            "chunk_index":   chunk.chunk_index,
            "snippet":       chunk.text,   # clave esperada por PineconeService.search()
            "source_type":   "pdf",
            "equipment":     "TRS4531",
        },
    }


# ─── Embeddings ──────────────────────────────────────────────────────────────

async def _embed_chunks(
    chunks: List[PdfChunk],
    embedder: OpenAIEmbeddingProvider,
) -> List[dict]:
    """Genera embeddings en batches y construye los vectores para Pinecone."""
    vectors = []
    total   = len(chunks)

    for i in range(0, total, EMBED_BATCH):
        batch     = chunks[i : i + EMBED_BATCH]
        end_idx   = min(i + EMBED_BATCH, total)
        print(f"      Embeddings {i + 1:>4}–{end_idx:>4} / {total}…")

        embeddings = await embedder.embed_batch([c.text for c in batch])
        vectors.extend(_build_vector(c, emb) for c, emb in zip(batch, embeddings))

        if end_idx < total:
            time.sleep(RATE_WAIT)

    return vectors


# ─── Pinecone upsert ─────────────────────────────────────────────────────────

def _upsert(vectors: List[dict]) -> None:
    """Sube vectores a Pinecone en batches."""
    from pinecone import Pinecone
    index = Pinecone(api_key=settings.pinecone_api_key).Index(settings.pinecone_index_name)
    total = len(vectors)

    for i in range(0, total, PINECONE_BATCH):
        batch   = vectors[i : i + PINECONE_BATCH]
        end_idx = min(i + PINECONE_BATCH, total)
        print(f"      Pinecone upsert {i + 1:>4}–{end_idx:>4} / {total}…")
        index.upsert(vectors=batch, namespace=settings.pinecone_namespace)
        time.sleep(0.2)


# ─── Pipeline por documento ──────────────────────────────────────────────────

async def process_pdf(
    pdf_path: Path,
    embedder: OpenAIEmbeddingProvider,
    pdf_service: PdfService,
) -> DocumentResult:
    """
    Procesa un PDF de principio a fin.
    Captura excepciones para no interrumpir el loop principal.
    """
    result = DocumentResult(document_name=pdf_path.name)
    try:
        print(f"    Extrayendo texto…")
        chunks, page_count = pdf_service.extract_chunks(pdf_path, pdf_path.name)
        result.pages  = page_count
        result.chunks = len(chunks)
        print(f"    Páginas: {page_count}  |  Chunks: {len(chunks)}")

        if not chunks:
            print(f"    Sin texto extraíble — se omite.")
            return result

        vectors = await _embed_chunks(chunks, embedder)
        _upsert(vectors)

    except Exception as exc:
        result.error = str(exc)
        print(f"    ERROR: {exc}")

    return result


# ─── Validaciones de configuración ───────────────────────────────────────────

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


# ─── Punto de entrada ─────────────────────────────────────────────────────────

async def main() -> None:
    print("=" * 60)
    print("TECPORT AI — Pipeline de Ingesta RAG")
    print("=" * 60)

    pdf_files = sorted(DOCUMENTS_DIR.glob("*.pdf"))

    print(f"Directorio      : {DOCUMENTS_DIR}")
    print(f"PDFs encontrados: {len(pdf_files)}\n")

    if not pdf_files:
        print("No se encontraron PDFs.")
        print("Coloca los archivos en:  backend/documents/")
        return

    for i, f in enumerate(pdf_files, 1):
        size_mb = f.stat().st_size / 1024 / 1024
        print(f"  {i}. {f.name:<55} {size_mb:.1f} MB")

    print()
    if not _check_config():
        return

    print(f"Índice   : {settings.pinecone_index_name}")
    print(f"Namespace: {settings.pinecone_namespace}")
    print(f"Modelo   : {settings.openai_embedding_model}")
    print("-" * 60)

    embedder    = OpenAIEmbeddingProvider()
    pdf_service = PdfService()
    results: List[DocumentResult] = []

    for idx, pdf_path in enumerate(pdf_files, 1):
        print(f"\n[{idx}/{len(pdf_files)}] {pdf_path.name}")
        result = await process_pdf(pdf_path, embedder, pdf_service)
        results.append(result)

    # ─── Resumen final ────────────────────────────────────────────────────────
    ok_list   = [r for r in results if r.ok]
    fail_list = [r for r in results if not r.ok]

    print("\n" + "=" * 60)
    print("RESUMEN FINAL")
    print("=" * 60)
    print(f"  total_documents      : {len(results)}")
    print(f"  exitosos             : {len(ok_list)}")
    print(f"  con error            : {len(fail_list)}")
    print(f"  total_pages          : {sum(r.pages  for r in ok_list)}")
    print(f"  total_chunks_uploaded: {sum(r.chunks for r in ok_list)}")

    if ok_list:
        print("\n  Detalle por documento:")
        for r in ok_list:
            print(f"    ✓  {r.document_name:<52}  {r.pages:>3} pág  {r.chunks:>5} chunks")

    if fail_list:
        print("\n  Con errores:")
        for r in fail_list:
            print(f"    ✗  {r.document_name}")
            print(f"       {r.error}")

    print()


if __name__ == "__main__":
    asyncio.run(main())
