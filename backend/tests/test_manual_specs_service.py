"""Tests para chunking del Capítulo 9 (especificaciones)."""
from pathlib import Path

from app.services.manual_specs_service import (
    SPECS_MD_FILENAME,
    ManualSpecsService,
    _DOC_DIR,
)

MD_PATH = _DOC_DIR / SPECS_MD_FILENAME


def test_cap9_md_exists():
    assert MD_PATH.exists(), f"Coloca {SPECS_MD_FILENAME} en {_DOC_DIR}"


def test_cap9_chunks_by_subsection():
    service = ManualSpecsService()
    chunks, sections = service.extract_chunks(MD_PATH, SPECS_MD_FILENAME)
    assert sections >= 3
    assert len(chunks) >= 15

    titles = {c.section_title for c in chunks}
    assert "Motor" in titles
    assert "Transmisión" in titles
    assert "Dimensiones" in titles

    motor = next(c for c in chunks if c.section_title == "Motor")
    assert "DANA TE30" not in motor.text  # solo motor
    assert "Cummins QSM11" in motor.text
    assert "| Fabricante / modelo |" in motor.text
