"""Tests para detección de códigos de falla en preguntas de chat."""
import unittest

from app.services.fault_code_parser import parse_fault_code_query


class TestFaultCodeParser(unittest.TestCase):
  # ── Códigos numéricos (Vehicle Controller / Cummins) ─────────────────────

    def test_codigo_1607_variants(self):
        for q in (
            "¿Qué significa el código 1607?",
            "Código de error 1607",
            "Dime el código de error 1607",
            "What does fault code 1607 mean?",
            "O que significa o código 1607?",
        ):
            with self.subTest(q=q):
                r = parse_fault_code_query(q)
                self.assertTrue(r.is_fault_question)
                self.assertFalse(r.is_ambiguous)
                self.assertEqual(r.primary_code, "1607")

    def test_codigo_1705(self):
        r = parse_fault_code_query("Código de falla 1705")
        self.assertEqual(r.primary_code, "1705")

    def test_codigo_122(self):
        r = parse_fault_code_query("Código de error 122")
        self.assertEqual(r.primary_code, "122")

    def test_codigo_111(self):
        r = parse_fault_code_query("¿Qué significa el código 111?")
        self.assertEqual(r.primary_code, "111")

    def test_error_1705(self):
        r = parse_fault_code_query("Error 1705")
        self.assertEqual(r.primary_code, "1705")

    # ── Códigos con punto (DANA TE30) ────────────────────────────────────────

    def test_codigo_85_01(self):
        for q in ("Dime el código 85.01", "Error code 85.01", "Código de erro 85.01"):
            with self.subTest(q=q):
                r = parse_fault_code_query(q)
                self.assertEqual(r.primary_code, "85.01")

    def test_codigo_84_00(self):
        r = parse_fault_code_query("¿Qué significa el código 84.00?")
        self.assertEqual(r.primary_code, "84.00")

  # ── Códigos alfanuméricos (DANA TE30) ────────────────────────────────────

    def test_codigo_3c_02(self):
        r = parse_fault_code_query("¿Qué significa el código 3C.02?")
        self.assertEqual(r.primary_code, "3C.02")

  # ── SPN + FMI ────────────────────────────────────────────────────────────

    def test_spn_fmi(self):
        r = parse_fault_code_query("SPN 102 FMI 3")
        self.assertTrue(r.is_fault_question)
        self.assertFalse(r.is_ambiguous)
        self.assertEqual(r.spn, "102")
        self.assertEqual(r.fmi, "3")
        self.assertIn("SPN 102 FMI 3", r.search_text)

  # ── Consultas ambiguas ───────────────────────────────────────────────────

    def test_fmi_solo_ambiguo(self):
        r = parse_fault_code_query("¿Qué significa FMI 3?")
        self.assertTrue(r.is_fault_question)
        self.assertTrue(r.is_ambiguous)
        self.assertIsNone(r.search_text)

    def test_codigo_3_ambiguo(self):
        r = parse_fault_code_query("Dime el código 3")
        self.assertTrue(r.is_ambiguous)
        self.assertIsNone(r.primary_code)


if __name__ == "__main__":
    unittest.main()
