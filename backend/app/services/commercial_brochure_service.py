"""Chunking del brochure técnico comercial TRS4531 (Markdown)."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Tuple

H2_HEADER = re.compile(r"^##\s+(.+)$", re.MULTILINE)
H3_HEADER = re.compile(r"^###\s+(.+)$", re.MULTILINE)

_H2_SPLIT_BY_H3 = frozenset({
    "diagramas técnicos",
    "contactos tecport",
})

BROCHURE_TEC_MD_FILENAME = "TRS4531_Brochure_Tecnico_ESP.md"
BROCHURE_TEC_PDF_FILENAME = "TRS4531_ Brochure Técnico_ESP_compressed (2).pdf"

_DOC_DIR = (
    Path(__file__).resolve().parent.parent.parent
    / "documents"
    / "comercial"
    / "trs4531"
)


@dataclass
class CommercialBrochureChunk:
    document_name: str
    section: int
    chunk_index: int
    text: str
    section_title: str = ""
    file_meta: dict = field(default_factory=dict)


def build_embedding_text(chunk: CommercialBrochureChunk) -> str:
    title = chunk.section_title or "brochure técnico"
    prefix = f"TRS4531 brochure técnico comercial {title}"
    return f"{prefix}\n{chunk.text}"


def chunk_to_pinecone_metadata(chunk: CommercialBrochureChunk) -> dict:
    return {
        "equipment": "TRS4531",
        "doc_type": "commercial_technical",
        "doc_category": "comercial",
        "section_title": chunk.section_title,
        "document_name": chunk.document_name,
        "source_type": "markdown",
        "priority": "medium",
        "page": chunk.section,
        "chunk_index": chunk.chunk_index,
        "snippet": chunk.text[:1000],
    }


def _append_chunk(
    chunks: List[CommercialBrochureChunk],
    document_name: str,
    section_num: int,
    chunk_index: int,
    text: str,
    section_title: str,
) -> None:
    text = text.strip()
    if not text:
        return
    chunks.append(CommercialBrochureChunk(
        document_name=document_name,
        section=section_num,
        chunk_index=chunk_index,
        text=text,
        section_title=section_title,
    ))


def _split_h3_sections(
    section_text: str,
    document_name: str,
    section_num: int,
    chunks: List[CommercialBrochureChunk],
    h2_title: str,
) -> None:
    matches = list(H3_HEADER.finditer(section_text))
    if not matches:
        _append_chunk(chunks, document_name, section_num, 0, section_text, h2_title)
        return

    for i, match in enumerate(matches):
        title = match.group(1).strip()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(section_text)
        piece = section_text[start:end].strip()
        _append_chunk(chunks, document_name, section_num, i, piece, title)


class CommercialBrochureService:
    def extract_chunks(
        self, md_path: str | Path, document_name: str
    ) -> Tuple[List[CommercialBrochureChunk], int]:
        content = Path(md_path).read_text(encoding="utf-8")
        h2_matches = list(H2_HEADER.finditer(content))
        chunks: List[CommercialBrochureChunk] = []
        section_num = 0

        for i, match in enumerate(h2_matches):
            h2_title = match.group(1).strip()
            h2_key = h2_title.lower()

            start = match.start()
            end = h2_matches[i + 1].start() if i + 1 < len(h2_matches) else len(content)
            section_text = content[start:end].strip()
            if not section_text:
                continue

            section_num += 1

            if h2_key in _H2_SPLIT_BY_H3:
                _split_h3_sections(section_text, document_name, section_num, chunks, h2_title)
            else:
                _append_chunk(chunks, document_name, section_num, 0, section_text, h2_title)

        return chunks, section_num
