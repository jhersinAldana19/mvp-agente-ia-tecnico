"""Tests de chunking Markdown para códigos de falla."""
import tempfile
import unittest
from pathlib import Path

from app.services.markdown_service import MarkdownService


SAMPLE_MD = """\
# Códigos de falla TRS4531

Introducción general del documento.

## Código de falla TRS4531 — 1607

**Descripción:** Falla de sensor.
**SPN:** 1607
**FMI:** 3
**Acción:** Verificar cableado.

## Código de falla TRS4531 — 85.01

**Descripción:** Presión baja transmisión.
**Subsistema:** DANA TE30
**Acción:** Revisar nivel de aceite.

## Código de error Cummins — 111

**Descripción:** Presión de aceite baja.
**Acción:** Detener motor.
"""


class TestMarkdownService(unittest.TestCase):
    def test_chunks_por_encabezado(self):
        with tempfile.TemporaryDirectory() as tmp:
            md_path = Path(tmp) / "trs4531_codigos_falla_vehicle.md"
            md_path.write_text(SAMPLE_MD, encoding="utf-8")

            chunks, sections = MarkdownService().extract_chunks(
                md_path, md_path.name
            )

        self.assertEqual(sections, 3)
        self.assertEqual(len(chunks), 3)
        self.assertIn("1607", chunks[0].text)
        self.assertIn("85.01", chunks[1].text)
        self.assertIn("111", chunks[2].text)
        self.assertNotIn("Introducción general", chunks[0].text)


if __name__ == "__main__":
    unittest.main()
