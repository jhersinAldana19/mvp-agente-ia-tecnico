"""Extracción de texto y chunking de Markdown para códigos de falla."""
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

# Encabezados que delimitan una ficha de código de falla.
_SECTION_HEADER = re.compile(
    r"^##\s+(?:Código de falla|Código de error|Codigo de falla|Codigo de error)",
    re.MULTILINE | re.IGNORECASE,
)

# Sub-encabezados dentro de una ficha muy larga.
_SUBSECTION_HEADER = re.compile(r"^###\s+", re.MULTILINE)

MAX_SECTION_CHARS = 4000

_PRIMARY_CODE_RE = re.compile(r"C[oó]digo principal:\s*(\S+)", re.IGNORECASE)
_SPN_RE = re.compile(r"(?:J1939\s+)?SPN:\s*(\d+)", re.IGNORECASE)
_FMI_RE = re.compile(r"(?:J1939\s+)?FMI:\s*(\d+)", re.IGNORECASE)


def extract_fault_metadata(text: str) -> dict:
    """Extrae fault_code, spn y fmi de una ficha Markdown."""
    meta: dict = {}
    if m := _PRIMARY_CODE_RE.search(text):
        code = m.group(1).strip()
        meta["fault_code"] = code.upper() if re.search(r"[A-Fa-f]", code) else code
    if m := _SPN_RE.search(text):
        meta["spn"] = m.group(1)
    if m := _FMI_RE.search(text):
        meta["fmi"] = m.group(1)
    return meta


def build_embedding_text(chunk_text: str, fault_code: str | None, subsystem: str) -> str:
    """Prefijo searchable para mejorar recuperación semántica por código exacto."""
    prefix = f"TRS4531 fault code {fault_code} {subsystem}" if fault_code else f"TRS4531 fault code {subsystem}"
    return f"{prefix}\n{chunk_text}"


@dataclass
class MarkdownChunk:
    document_name: str
    section: int
    chunk_index: int
    text: str


def _split_oversized_section(text: str) -> List[str]:
    """Divide secciones largas respetando sub-encabezados ###."""
    if len(text) <= MAX_SECTION_CHARS:
        return [text]

    parts: List[str] = []
    matches = list(_SUBSECTION_HEADER.finditer(text))
    if not matches:
        return [text]

    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        piece = text[start:end].strip()
        if piece:
            parts.append(piece)

    preamble = text[: matches[0].start()].strip()
    if preamble:
        parts.insert(0, preamble)

    return parts or [text]


class MarkdownService:
    def extract_chunks(
        self, md_path: str | Path, document_name: str
    ) -> Tuple[List[MarkdownChunk], int]:
        """
        Extrae chunks de un Markdown de códigos de falla.

        Cada ficha bajo ``## Código de falla/error`` se mantiene lo más
        completa posible. Solo se subdivide si supera MAX_SECTION_CHARS.

        Returns:
            (chunks, section_count)
        """
        content = Path(md_path).read_text(encoding="utf-8")
        matches = list(_SECTION_HEADER.finditer(content))

        if not matches:
            return [MarkdownChunk(document_name, 1, 0, content.strip())], 1

        chunks: List[MarkdownChunk] = []
        section_num = 0

        for i, match in enumerate(matches):
            section_num += 1
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
            section_text = content[start:end].strip()
            if not section_text:
                continue

            for chunk_idx, piece in enumerate(_split_oversized_section(section_text)):
                chunks.append(MarkdownChunk(
                    document_name=document_name,
                    section=section_num,
                    chunk_index=chunk_idx,
                    text=piece,
                ))

        return chunks, section_num
