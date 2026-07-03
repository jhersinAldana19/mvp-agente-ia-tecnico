"""Tests de chunking del manual de repuestos."""
import tempfile
import unittest
from pathlib import Path

from app.services.spare_parts_service import (
    SparePartsService,
    extract_part_numbers,
    parse_frontmatter,
)


SAMPLE_CATALOG = """\
---
producto: "Tecport TRS4531"
capitulo: "CAP 08"
sistema: "Sistema de frenos"
tipo_documento: "catalogo_de_partes"
---

# Tecport TRS4531 - Sistema de frenos

## Dibujo 08.001 - Conjunto de bomba de freno

**Metadatos del dibujo**

| Campo | Valor |
|---|---|
| Número de dibujo | 08.001 |
| Descripción | Conjunto de bomba de freno |

### Lista de partes - Conjunto de bomba de freno

| Pos. | Nro. de parte | Designación | Cantidad |
|---:|---|---|---:|
| 1 | 08.01.123456789 | bomba de freno | 1 |
| 2 | 08.01.987654321 | o-ring | 2 |
"""


SAMPLE_INDEX = """\
---
tipo_documento: "indice_general_manual_repuestos"
---

# Índice

## Índice general por capítulos

| Capítulo | Sistema |
|---:|---|
| 08 | Sistema de frenos |
"""


class TestSparePartsService(unittest.TestCase):
    def test_parse_frontmatter(self):
        meta, body = parse_frontmatter(SAMPLE_CATALOG)
        self.assertEqual(meta["capitulo"], "CAP 08")
        self.assertIn("# Tecport TRS4531", body)

    def test_chunks_por_dibujo(self):
        with tempfile.TemporaryDirectory() as tmp:
            md_path = Path(tmp) / "08_brake_system_TRS4531.md"
            md_path.write_text(SAMPLE_CATALOG, encoding="utf-8")
            chunks, sections = SparePartsService().extract_chunks(md_path, md_path.name)

        self.assertEqual(sections, 1)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].drawing_number, "08.001")
        self.assertIn("08.01.123456789", chunks[0].part_numbers)

    def test_index_por_seccion(self):
        with tempfile.TemporaryDirectory() as tmp:
            md_path = Path(tmp) / "C_indice.md"
            md_path.write_text(SAMPLE_INDEX, encoding="utf-8")
            chunks, sections = SparePartsService().extract_chunks(md_path, md_path.name)

        self.assertGreaterEqual(sections, 1)
        self.assertTrue(any("Sistema de frenos" in c.text for c in chunks))

    def test_extract_part_numbers(self):
        nums = extract_part_numbers(SAMPLE_CATALOG)
        self.assertIn("08.01.123456789", nums)
        self.assertIn("08.01.987654321", nums)


if __name__ == "__main__":
    unittest.main()
