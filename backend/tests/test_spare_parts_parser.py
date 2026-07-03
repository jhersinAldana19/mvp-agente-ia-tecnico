"""Tests del parser de consultas de repuestos."""
import unittest

from app.services.spare_parts_parser import parse_spare_parts_query


class TestSparePartsParser(unittest.TestCase):
    def test_part_number(self):
        r = parse_spare_parts_query("¿Cuál es el repuesto 08.01.123456789?")
        self.assertTrue(r.is_spare_parts_question)
        self.assertEqual(r.part_number, "08.01.123456789")

    def test_drawing_and_position(self):
        r = parse_spare_parts_query("Dibujo 08.001 posición 3")
        self.assertTrue(r.is_spare_parts_question)
        self.assertEqual(r.drawing_number, "08.001")
        self.assertEqual(r.position, "3")

    def test_chapter_keyword(self):
        r = parse_spare_parts_query("Repuestos del sistema de frenos")
        self.assertTrue(r.is_spare_parts_question)
        self.assertEqual(r.chapter, "08")

    def test_not_spare_parts(self):
        r = parse_spare_parts_query("¿Cómo lubricar la transmisión?")
        self.assertFalse(r.is_spare_parts_question)


if __name__ == "__main__":
    unittest.main()
