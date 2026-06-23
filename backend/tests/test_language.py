"""Tests for user-question language detection (es / en / pt)."""
import unittest

from app.services.llm.language import detect_language


class TestDetectLanguage(unittest.TestCase):
    def test_spanish_without_accents_fault_code(self):
        self.assertEqual(detect_language("codigo error 85.00"), "es")
        self.assertEqual(detect_language("Código de error 1607"), "es")
        self.assertEqual(detect_language("Dime el código 85.01"), "es")
        self.assertEqual(detect_language("que significa el codigo 122"), "es")

    def test_spanish_with_accents(self):
        self.assertEqual(detect_language("¿Qué significa el código 1607?"), "es")

    def test_english(self):
        self.assertEqual(detect_language("What does fault code 1607 mean?"), "en")
        self.assertEqual(detect_language("Error code 85.01"), "en")

    def test_portuguese(self):
        self.assertEqual(detect_language("O que significa o código 1607?"), "pt")
        self.assertEqual(detect_language("codigo de erro 85.01"), "pt")

    def test_default_spanish_for_ambiguous(self):
        self.assertEqual(detect_language("1607"), "es")
        self.assertEqual(detect_language("85.00"), "es")


if __name__ == "__main__":
    unittest.main()
