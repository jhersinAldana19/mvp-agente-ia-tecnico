#!/usr/bin/env python3
"""Verifica que cap7/cap9 .md estén en Pinecone y los PDF legacy no."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from pinecone import Pinecone

from app.core.config import settings
from app.services.embeddings.openai_embeddings import OpenAIEmbeddingProvider
from app.services.manual_lubrication_service import (
    LUB_MD_FILENAME,
    LUB_PDF_FILENAME,
    ManualLubricationService,
    _DOC_DIR as LUB_DIR,
)
from app.services.manual_specs_service import (
    SPECS_MD_FILENAME,
    SPECS_PDF_FILENAME,
    ManualSpecsService,
    _DOC_DIR as SPECS_DIR,
)

NS = "trs4531"


def _count_prefix(index, prefix: str) -> int:
    total = 0
    for page in index.list(prefix=prefix, namespace=NS):
        if hasattr(page, "vectors"):
            total += len(page.vectors)
        elif isinstance(page, list):
            if page and hasattr(page[0], "id"):
                total += len(page)
            elif page and isinstance(page[0], str):
                total += len(page)
            else:
                total += len(page)
        else:
            total += 1
    return total


def _count_by_filter(index, flt: dict) -> int:
    """Cuenta IDs vía list + fetch por metadata no es directo; usa query dummy con top_k."""
    return -1  # placeholder — usamos prefix counts


async def main() -> None:
    print("=" * 60)
    print("VERIFICACIÓN — Cap. 7 y Cap. 9 (Markdown vs PDF)")
    print("=" * 60)

    if not settings.pinecone_api_key:
        print("ERROR: PINECONE_API_KEY no configurado.")
        return

    index = Pinecone(api_key=settings.pinecone_api_key).Index(settings.pinecone_index_name)

    lub_local = len(ManualLubricationService().extract_chunks(
        LUB_DIR / LUB_MD_FILENAME, LUB_MD_FILENAME
    )[0])
    spec_local = len(ManualSpecsService().extract_chunks(
        SPECS_DIR / SPECS_MD_FILENAME, SPECS_MD_FILENAME
    )[0])

    lub_pine = _count_prefix(index, "lub-")
    spec_pine = _count_prefix(index, "spec-")
    pdf7_pine = _count_prefix(index, "cap7-lubricacion-trs4531-v1--p")
    pdf9_pine = _count_prefix(index, "cap9-especificaciones-trs4531--p")

    print(f"\nNamespace: {NS}  |  Índice: {settings.pinecone_index_name}\n")
    print(f"  {'Fuente':<35} {'Local':>8} {'Pinecone':>10} {'Estado':>10}")
    print("  " + "-" * 65)
    print(f"  {'cap7 .md (lub-*)':<35} {lub_local:>8} {lub_pine:>10} {_ok(lub_pine, lub_local):>10}")
    print(f"  {'cap9 .md (spec-*)':<35} {spec_local:>8} {spec_pine:>10} {_ok(spec_pine, spec_local):>10}")
    print(f"  {'cap7 PDF (legacy)':<35} {'—':>8} {pdf7_pine:>10} {_zero(pdf7_pine):>10}")
    print(f"  {'cap9 PDF (legacy)':<35} {'—':>8} {pdf9_pine:>10} {_zero(pdf9_pine):>10}")

    embedder = OpenAIEmbeddingProvider()
    q = await embedder.embed("litros aceite transmisión DANA TRS4531")

    r_md = index.query(
        vector=q,
        top_k=3,
        namespace=NS,
        filter={"doc_type": {"$eq": "manual_lubrication"}},
        include_metadata=True,
    )
    print("\n  Prueba RAG cap7 (.md) — top 3:")
    for m in r_md.matches:
        md = m.metadata
        print(f"    score={m.score:.3f}  {md.get('document_name')}  |  {md.get('section_title', '')[:50]}")

    r_pdf = index.query(
        vector=q,
        top_k=3,
        namespace=NS,
        filter={"document_name": {"$eq": LUB_PDF_FILENAME}},
        include_metadata=True,
    )
    print(f"\n  Vectores PDF cap7 restantes (filtro exacto): {len(r_pdf.matches)}  (esperado: 0)")

    r_pdf9 = index.query(
        vector=q,
        top_k=3,
        namespace=NS,
        filter={"document_name": {"$eq": SPECS_PDF_FILENAME}},
        include_metadata=True,
    )
    print(f"  Vectores PDF cap9 restantes (filtro exacto): {len(r_pdf9.matches)}  (esperado: 0)")

    all_ok = (
        lub_pine == lub_local
        and spec_pine == spec_local
        and pdf7_pine == 0
        and pdf9_pine == 0
        and len(r_pdf.matches) == 0
    )
    print("\n" + ("OK — el agente usa solo .md para cap7/cap9" if all_ok else "Revisa filas con estado distinto de OK"))


def _ok(pine: int, local: int) -> str:
    return "OK" if pine == local else "REVISAR"


def _zero(n: int) -> str:
    return "OK" if n == 0 else "QUEDAN PDF"


if __name__ == "__main__":
    asyncio.run(main())
