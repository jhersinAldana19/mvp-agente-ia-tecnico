"""Tests for fault metadata extraction from markdown chunks."""
import unittest

from app.services.markdown_service import extract_fault_metadata


SAMPLE_85_01 = """\
## Código de falla TRS4531 - DANA TE30 - 85.01

Código principal: 85.01
SPN: 3027
FMI: 1
"""


class TestExtractFaultMetadata(unittest.TestCase):
    def test_dana_code_with_spn_fmi(self):
        meta = extract_fault_metadata(SAMPLE_85_01)
        self.assertEqual(meta["fault_code"], "85.01")
        self.assertEqual(meta["spn"], "3027")
        self.assertEqual(meta["fmi"], "1")

    def test_alnum_code_uppercase(self):
        text = "Código principal: 3c.02\nSPN: 520218\nFMI: 2"
        meta = extract_fault_metadata(text)
        self.assertEqual(meta["fault_code"], "3C.02")


if __name__ == "__main__":
    unittest.main()
