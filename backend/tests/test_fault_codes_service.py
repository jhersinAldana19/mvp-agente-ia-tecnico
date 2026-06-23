"""Tests for local fault code lookup service."""
import unittest

from app.services.fault_codes_service import (
    buscar_codigo_falla,
    infer_subsystem_hints,
    snippet_contains_code,
)


class TestFaultCodesService(unittest.TestCase):
    def test_infer_subsystem_hints(self):
        self.assertEqual(infer_subsystem_hints("85.01")[0], "dana_te30")
        self.assertEqual(infer_subsystem_hints("3C.02")[0], "dana_te30")
        self.assertEqual(infer_subsystem_hints("122")[0], "cummins_qsm11_t3")
        self.assertEqual(infer_subsystem_hints("1607")[0], "vehicle_controller")

    def test_buscar_cummins_122(self):
        entry = buscar_codigo_falla("122")
        self.assertIsNotNone(entry)
        self.assertEqual(entry["subsystem"], "cummins_qsm11_t3")
        self.assertIn("122", entry["snippet"])

    def test_buscar_vehicle_1403(self):
        entry = buscar_codigo_falla("1403")
        self.assertIsNotNone(entry)
        self.assertEqual(entry["subsystem"], "vehicle_controller")
        self.assertIn("1403", entry["snippet"])

    def test_buscar_dana_85_01(self):
        entry = buscar_codigo_falla("85.01")
        self.assertIsNotNone(entry)
        self.assertEqual(entry["subsystem"], "dana_te30")

    def test_snippet_contains_code(self):
        self.assertTrue(snippet_contains_code("Código principal: 1607\n", "1607"))
        self.assertFalse(snippet_contains_code("Código principal: 1608\n", "1607"))


if __name__ == "__main__":
    unittest.main()
