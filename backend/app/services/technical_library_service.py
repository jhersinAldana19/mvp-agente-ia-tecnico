"""Chunking de documentos en Biblioteca técnica (Markdown, referencia general)."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, List, Tuple

H2 = re.compile(r"^##\s+(.+)$", re.MULTILINE)
H3 = re.compile(r"^###\s+(.+)$", re.MULTILINE)
H4 = re.compile(r"^####\s+(.+)$", re.MULTILINE)

MAX_CHUNK_CHARS = 10_000

HYDRAULICS_MD_FILENAME = "knowledge-in-detail-hydraulics-basic-principles.md"
HYDRAULICS_PDF_FILENAME = "knowledge-in-detail-hydraulics-basic-principles.pdf"

_DOC_DIR = (
    Path(__file__).resolve().parent.parent.parent / "documents" / "biblioteca-tecnica"
)

# Secciones editoriales sin contenido técnico útil para RAG.
_SKIP_H2 = frozenset({
    "advanced training with the bosch rexroth academy",
    "table of contents",
    "imprint",
})

@dataclass
class TechnicalLibraryChunk:
    document_name: str
    section: int
    chunk_index: int
    text: str
    section_title: str = ""
    library_title: str = "Hydraulics Basic Principles"
    file_meta: dict = field(default_factory=dict)


def build_embedding_text(chunk: TechnicalLibraryChunk) -> str:
    title = chunk.section_title or chunk.library_title
    return f"Biblioteca técnica hidráulica Rexroth {title}\n{chunk.text}"


def chunk_to_pinecone_metadata(chunk: TechnicalLibraryChunk) -> dict:
    return {
        "equipment": "general",
        "doc_type": "technical_library",
        "doc_category": "biblioteca_tecnica",
        "library_title": chunk.library_title,
        "section_title": chunk.section_title,
        "document_name": chunk.document_name,
        "source_type": "markdown",
        "priority": "low",
        "page": chunk.section,
        "chunk_index": chunk.chunk_index,
        "snippet": chunk.text[:1000],
    }


def _append(
    chunks: List[TechnicalLibraryChunk],
    document_name: str,
    section_num: int,
    chunk_index: int,
    text: str,
    section_title: str,
    library_title: str,
) -> None:
    text = text.strip()
    if not text:
        return
    chunks.append(TechnicalLibraryChunk(
        document_name=document_name,
        section=section_num,
        chunk_index=chunk_index,
        text=text,
        section_title=section_title,
        library_title=library_title,
    ))


def _split_by_pattern(
    text: str,
    pattern: re.Pattern[str],
    on_piece: Callable[[str, str, int], None],
    fallback_title: str,
) -> None:
    matches = list(pattern.finditer(text))
    if not matches:
        on_piece(text, fallback_title, 0)
        return

    for i, match in enumerate(matches):
        title = match.group(1).strip()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        on_piece(text[start:end].strip(), title, i)


def _split_oversized(text: str, title: str, on_piece: Callable[[str, str, int], None]) -> None:
    if H4.search(text):
        _split_by_pattern(text, H4, on_piece, title)
        return

    if len(text) <= MAX_CHUNK_CHARS:
        on_piece(text, title, 0)
        return

    def h4_piece(piece: str, piece_title: str, idx: int) -> None:
        if len(piece) <= MAX_CHUNK_CHARS:
            on_piece(piece, piece_title, idx)
            return
        # Último recurso: troceo por párrafos dobles.
        parts: List[str] = []
        buf: List[str] = []
        size = 0
        for block in re.split(r"\n\n+", piece):
            block = block.strip()
            if not block:
                continue
            if size + len(block) > MAX_CHUNK_CHARS and buf:
                parts.append("\n\n".join(buf))
                buf = [block]
                size = len(block)
            else:
                buf.append(block)
                size += len(block)
        if buf:
            parts.append("\n\n".join(buf))
        for j, part in enumerate(parts):
            on_piece(part, piece_title, idx * 100 + j)

    _split_by_pattern(text, H4, h4_piece, title)


class TechnicalLibraryService:
    def extract_chunks(
        self, md_path: str | Path, document_name: str
    ) -> Tuple[List[TechnicalLibraryChunk], int]:
        content = Path(md_path).read_text(encoding="utf-8")
        library_title = _read_title(content) or "Biblioteca técnica"

        h2_matches = list(H2.finditer(content))
        chunks: List[TechnicalLibraryChunk] = []
        section_num = 0
        chunk_counter = 0

        def emit(text: str, title: str) -> None:
            nonlocal chunk_counter

            def store(piece: str, piece_title: str, _idx: int) -> None:
                nonlocal chunk_counter
                _append(
                    chunks,
                    document_name,
                    section_num,
                    chunk_counter,
                    piece,
                    piece_title,
                    library_title,
                )
                chunk_counter += 1

            _split_oversized(text, title, store)

        for i, match in enumerate(h2_matches):
            h2_title = match.group(1).strip()
            if h2_title.lower() in _SKIP_H2:
                continue

            start = match.start()
            end = h2_matches[i + 1].start() if i + 1 < len(h2_matches) else len(content)
            section_text = content[start:end].strip()
            if not section_text:
                continue

            section_num += 1
            chunk_counter = 0

            # Capítulos numerados (1–5): subdividir por ### y luego #### si hace falta.
            if re.match(r"^\d+\s", h2_title):

                def h3_piece(piece: str, piece_title: str, idx: int) -> None:
                    _split_oversized(piece, piece_title, lambda t, tt, j: emit(t, tt))

                _split_by_pattern(section_text, H3, h3_piece, h2_title)
            else:
                emit(section_text, h2_title)

        return chunks, section_num


def _read_title(content: str) -> str | None:
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return None
