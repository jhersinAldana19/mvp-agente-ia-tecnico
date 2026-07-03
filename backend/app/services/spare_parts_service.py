"""Chunking, metadata y lookup local del manual de repuestos TRS4531 (Markdown)."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Tuple

DRAWING_HEADER = re.compile(
    r"^##\s+Dibujo\s+(\d{2}\.\d{3})\s*-\s*(.+)$",
    re.MULTILINE | re.IGNORECASE,
)
SECTION_HEADER = re.compile(r"^##\s+(.+)$", re.MULTILINE)
PART_NUMBER_RE = re.compile(r"\b(\d{2}\.\d{2}\.[0-9A-Za-z]+)\b")
PARTS_TABLE_MARKER = re.compile(r"^###\s+Lista de partes", re.MULTILINE | re.IGNORECASE)
MAX_TABLE_ROWS = 30

_DOC_DIR = (
    Path(__file__).resolve().parent.parent.parent
    / "documents"
    / "manuales-de-repuestos"
    / "trs4531"
)


@dataclass
class SparePartsChunk:
    document_name: str
    section: int
    chunk_index: int
    text: str
    file_meta: dict = field(default_factory=dict)
    drawing_number: str | None = None
    drawing_description: str | None = None
    part_numbers: list[str] = field(default_factory=list)


def parse_frontmatter(content: str) -> tuple[dict, str]:
    if not content.startswith("---"):
        return {}, content
    end = content.find("\n---", 3)
    if end == -1:
        return {}, content
    fm_block = content[3:end].strip()
    body = content[end + 4 :].lstrip("\n")
    meta: dict = {}
    for line in fm_block.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip('"')
    return meta, body


def _chapter_number(file_meta: dict) -> str:
    cap = file_meta.get("capitulo", "")
    m = re.search(r"(\d{2})", cap)
    return m.group(1) if m else ""


def extract_drawing_metadata(section_text: str) -> dict:
    meta: dict = {}
    if m := re.search(r"\|\s*N[uú]mero de dibujo\s*\|\s*(\d{2}\.\d{3})", section_text, re.I):
        meta["drawing_number"] = m.group(1)
    if m := re.search(r"\|\s*Descripci[oó]n\s*\|\s*([^|\n]+)", section_text, re.I):
        meta["drawing_description"] = m.group(1).strip()
    if m := re.search(r"\|\s*P[aá]gina del diagrama\s*\|\s*([^|\n]+)", section_text, re.I):
        meta["diagram_page"] = m.group(1).strip()
    return meta


def extract_part_numbers(text: str) -> list[str]:
    return list(dict.fromkeys(PART_NUMBER_RE.findall(text)))


def build_embedding_text(chunk: SparePartsChunk) -> str:
    fm = chunk.file_meta
    tokens = [
        "TRS4531 spare parts catalog manual de repuestos",
        fm.get("sistema") or fm.get("seccion") or "",
        fm.get("capitulo") or "",
        f"drawing {chunk.drawing_number}" if chunk.drawing_number else "",
        chunk.drawing_description or "",
    ]
    prefix = " ".join(t for t in tokens if t).strip()
    return f"{prefix}\n{chunk.text}" if prefix else chunk.text


def _is_table_line(line: str) -> bool:
    return line.strip().startswith("|") and line.strip().endswith("|")


def _split_parts_table(section_text: str) -> list[str]:
    """Divide tablas largas de partes en bloques con encabezado repetido."""
    match = PARTS_TABLE_MARKER.search(section_text)
    if not match:
        return [section_text]

    before = section_text[: match.start()].rstrip()
    after = section_text[match.start() :]
    lines = after.splitlines()
    if len(lines) < 3:
        return [section_text]

    header_lines: list[str] = []
    data_rows: list[str] = []
    past_title = False
    past_sep = False

    for line in lines:
        if not past_title:
            header_lines.append(line)
            if line.strip().startswith("###"):
                past_title = True
            continue
        if not past_sep:
            header_lines.append(line)
            if re.match(r"^\|\s*[-:| ]+\|\s*$", line.strip()):
                past_sep = True
            continue
        if _is_table_line(line):
            data_rows.append(line)

    if len(data_rows) <= MAX_TABLE_ROWS:
        return [section_text]

    pieces: list[str] = []
    table_header = "\n".join(header_lines)
    for i in range(0, len(data_rows), MAX_TABLE_ROWS):
        batch = data_rows[i : i + MAX_TABLE_ROWS]
        pieces.append(f"{before}\n\n{table_header}\n" + "\n".join(batch))
    return pieces


def _make_chunk(
    *,
    document_name: str,
    section: int,
    chunk_index: int,
    text: str,
    file_meta: dict,
    drawing_number: str | None = None,
    drawing_description: str | None = None,
) -> SparePartsChunk:
    drawing_meta = extract_drawing_metadata(text)
    return SparePartsChunk(
        document_name=document_name,
        section=section,
        chunk_index=chunk_index,
        text=text.strip(),
        file_meta=file_meta,
        drawing_number=drawing_number or drawing_meta.get("drawing_number"),
        drawing_description=drawing_description or drawing_meta.get("drawing_description"),
        part_numbers=extract_part_numbers(text),
    )


class SparePartsService:
    def extract_chunks(
        self, md_path: str | Path, document_name: str
    ) -> Tuple[List[SparePartsChunk], int]:
        raw = Path(md_path).read_text(encoding="utf-8")
        file_meta, body = parse_frontmatter(raw)
        subtype = file_meta.get("tipo_documento", "catalogo_de_partes")

        # Índice e instrucciones: un chunk por sección ## (routing de alto nivel).
        if subtype in {"indice_general_manual_repuestos", "instrucciones_manual_repuestos"}:
            return self._chunks_by_section(body, document_name, file_meta)

        drawing_matches = list(DRAWING_HEADER.finditer(body))
        if not drawing_matches:
            return self._chunks_by_section(body, document_name, file_meta)

        chunks: List[SparePartsChunk] = []
        section_num = 0
        for i, match in enumerate(drawing_matches):
            section_num += 1
            start = match.start()
            end = drawing_matches[i + 1].start() if i + 1 < len(drawing_matches) else len(body)
            section_text = body[start:end].strip()
            if not section_text:
                continue

            drawing_number = match.group(1)
            drawing_description = match.group(2).strip()
            for chunk_idx, piece in enumerate(_split_parts_table(section_text)):
                chunks.append(
                    _make_chunk(
                        document_name=document_name,
                        section=section_num,
                        chunk_index=chunk_idx,
                        text=piece,
                        file_meta=file_meta,
                        drawing_number=drawing_number,
                        drawing_description=drawing_description,
                    )
                )
        return chunks, section_num

    def _chunks_by_section(
        self, body: str, document_name: str, file_meta: dict
    ) -> Tuple[List[SparePartsChunk], int]:
        matches = list(SECTION_HEADER.finditer(body))
        if not matches:
            text = body.strip()
            if not text:
                return [], 0
            return [
                _make_chunk(
                    document_name=document_name,
                    section=1,
                    chunk_index=0,
                    text=text,
                    file_meta=file_meta,
                )
            ], 1

        chunks: List[SparePartsChunk] = []
        section_num = 0
        for i, match in enumerate(matches):
            section_num += 1
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
            section_text = body[start:end].strip()
            if section_text:
                chunks.append(
                    _make_chunk(
                        document_name=document_name,
                        section=section_num,
                        chunk_index=0,
                        text=section_text,
                        file_meta=file_meta,
                    )
                )
        return chunks, section_num


def chunk_to_pinecone_metadata(chunk: SparePartsChunk) -> dict:
    fm = chunk.file_meta
    subtype = fm.get("tipo_documento", "catalogo_de_partes")
    chapter = _chapter_number(fm)
    return {
        "equipment": "TRS4531",
        "doc_type": "spare_parts",
        "category": "manuales_de_repuestos",
        "document_subtype": subtype,
        "chapter": chapter,
        "system": fm.get("sistema") or fm.get("seccion") or "",
        "drawing_number": chunk.drawing_number or "",
        "source_type": "markdown",
        "priority": "high" if subtype != "catalogo_de_partes" else "normal",
        "document_name": chunk.document_name,
        "page": chunk.section,
        "chunk_index": chunk.chunk_index,
        "snippet": chunk.text,
        "part_numbers": chunk.part_numbers[:50],
    }


@lru_cache(maxsize=1)
def _load_part_index() -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}
    if not _DOC_DIR.exists():
        return index

    service = SparePartsService()
    for md_path in sorted(_DOC_DIR.glob("*.md")):
        chunks, _ = service.extract_chunks(md_path, md_path.name)
        for chunk in chunks:
            meta = chunk_to_pinecone_metadata(chunk)
            for part_no in chunk.part_numbers:
                entry = {**meta, "part_number": part_no}
                index.setdefault(part_no, []).append(entry)
    return index


@lru_cache(maxsize=1)
def _load_drawing_index() -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}
    if not _DOC_DIR.exists():
        return index

    service = SparePartsService()
    for md_path in sorted(_DOC_DIR.glob("*.md")):
        chunks, _ = service.extract_chunks(md_path, md_path.name)
        for chunk in chunks:
            if not chunk.drawing_number:
                continue
            entry = chunk_to_pinecone_metadata(chunk)
            index.setdefault(chunk.drawing_number, []).append(entry)
    return index


def buscar_numero_parte(part_number: str) -> Optional[dict]:
    normalized = part_number.strip()
    matches = _load_part_index().get(normalized, [])
    return matches[0] if matches else None


def buscar_dibujo(drawing_number: str) -> list[dict]:
    return _load_drawing_index().get(drawing_number.strip(), [])


def formatear_contexto_repuesto(entry: dict) -> str:
    part = entry.get("part_number") or ""
    drawing = entry.get("drawing_number") or ""
    header = f"[DATOS ESTRUCTURADOS — Repuesto {part or drawing} — PRIORIDAD MÁXIMA]"
    return (
        f"{header}\n"
        f"Sistema: {entry.get('system', '')}\n"
        f"Capítulo: {entry.get('chapter', '')}\n"
        f"Dibujo: {drawing}\n"
        f"Documento: {entry.get('document_name', '')}\n"
        f"Sección: {entry.get('page', '')}\n\n"
        f"{entry.get('snippet', '')}"
    )


def snippet_contains_part_number(snippet: str, part_number: str) -> bool:
    return part_number in extract_part_numbers(snippet)
