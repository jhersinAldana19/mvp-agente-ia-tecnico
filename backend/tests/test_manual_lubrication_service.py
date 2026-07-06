"""Tests para chunking del Capítulo 7 (lubricación)."""
from pathlib import Path

from app.services.manual_lubrication_service import (
    LUB_MD_FILENAME,
    ManualLubricationService,
    _DOC_DIR,
)

MD_PATH = _DOC_DIR / LUB_MD_FILENAME


def test_cap7_md_exists():
    assert MD_PATH.exists(), f"Coloca {LUB_MD_FILENAME} en {_DOC_DIR}"


def test_cap7_lubricant_table_chunk():
    service = ManualLubricationService()
    chunks, sections = service.extract_chunks(MD_PATH, LUB_MD_FILENAME)
    assert sections == 15
    assert len(chunks) >= 20

    tabla = next(c for c in chunks if "Tabla de lubricantes" in c.section_title)
    assert "60 L" in tabla.text
    assert "DEXRON III" in tabla.text

    nota5 = next(c for c in chunks if c.section_title.startswith("Nota 5"))
    assert "DEXRON III" in nota5.text
