import unittest
from pathlib import Path

from app.services.technical_library_service import (
    HYDRAULICS_MD_FILENAME,
    TechnicalLibraryService,
    _DOC_DIR,
)


class TestTechnicalLibraryService(unittest.TestCase):
    def test_extract_chunks_from_hydraulics_md(self):
        md_path = _DOC_DIR / HYDRAULICS_MD_FILENAME
        if not md_path.exists():
            self.skipTest("MD de biblioteca no presente en documents/")

        chunks, sections = TechnicalLibraryService().extract_chunks(
            md_path, HYDRAULICS_MD_FILENAME
        )
        self.assertGreater(sections, 3)
        self.assertGreater(len(chunks), 10)
        self.assertTrue(all(c.document_name == HYDRAULICS_MD_FILENAME for c in chunks))
        titles = " ".join(c.section_title.lower() for c in chunks)
        self.assertNotIn("table of contents", titles)


if __name__ == "__main__":
    unittest.main()
