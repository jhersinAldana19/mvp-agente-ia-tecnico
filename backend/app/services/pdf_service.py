"""Extracción de texto y chunking de PDFs con PyMuPDF."""
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import fitz  # PyMuPDF

CHUNK_SIZE    = 1200  # caracteres por chunk
CHUNK_OVERLAP = 200   # solapamiento para preservar contexto entre chunks


@dataclass
class PdfChunk:
    document_name: str
    page: int
    chunk_index: int
    text: str


def _split_text(text: str) -> List[str]:
    """Divide texto en chunks con solapamiento por caracteres."""
    chunks, start = [], 0
    while start < len(text):
        piece = text[start : start + CHUNK_SIZE].strip()
        if piece:
            chunks.append(piece)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


class PdfService:
    def extract_chunks(
        self, pdf_path: str | Path, document_name: str
    ) -> Tuple[List[PdfChunk], int]:
        """
        Extrae chunks de texto de cada página del PDF.

        Returns:
            (chunks, page_count)
        """
        doc    = fitz.open(str(pdf_path))
        chunks = []

        for page_num in range(len(doc)):
            text = doc[page_num].get_text("text").strip()
            if not text:
                continue
            for chunk_idx, piece in enumerate(_split_text(text)):
                chunks.append(PdfChunk(
                    document_name=document_name,
                    page=page_num + 1,
                    chunk_index=chunk_idx,
                    text=piece,
                ))

        page_count = len(doc)
        doc.close()
        return chunks, page_count
