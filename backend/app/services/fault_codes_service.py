"""Lookup local de fichas de códigos de falla desde Markdown (fallback exacto)."""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Optional

from app.services.markdown_service import MarkdownService, extract_fault_metadata

_DOC_DIR = (
    Path(__file__).resolve().parent.parent.parent
    / "documents"
    / "codigos-de-fallas"
    / "trs4531"
)

_SUBSYSTEM_BY_FILE = {
    "trs4531_codigos_falla_cummins_qsm11_t3.md": {
        "system": "engine",
        "subsystem": "cummins_qsm11_t3",
    },
    "trs4531_codigos_falla_dana_te30.md": {
        "system": "transmission",
        "subsystem": "dana_te30",
    },
    "trs4531_codigos_falla_vehicle.md": {
        "system": "vehicle_control",
        "subsystem": "vehicle_controller",
    },
}


def infer_subsystem_hints(code: str) -> list[str]:
    """Orden de subsistemas probables según formato del código (sin excluir otros)."""
    if re.search(r"[A-Fa-f]\.", code) or re.fullmatch(r"\d{1,3}\.\d{2}", code):
        return ["dana_te30", "cummins_qsm11_t3", "vehicle_controller"]
    if re.fullmatch(r"\d{4}", code):
        return ["vehicle_controller", "cummins_qsm11_t3", "dana_te30"]
    if re.fullmatch(r"\d{3}", code):
        return ["cummins_qsm11_t3", "vehicle_controller", "dana_te30"]
    return ["cummins_qsm11_t3", "vehicle_controller", "dana_te30"]


@lru_cache(maxsize=1)
def _load_index() -> dict[str, list[dict]]:
    """Índice fault_code → fichas, construido una vez desde los .md locales."""
    index: dict[str, list[dict]] = {}
    if not _DOC_DIR.exists():
        return index

    md_service = MarkdownService()
    for md_path in sorted(_DOC_DIR.glob("*.md")):
        file_meta = _SUBSYSTEM_BY_FILE.get(md_path.name, {})
        chunks, _ = md_service.extract_chunks(md_path, md_path.name)
        for chunk in chunks:
            fault_meta = extract_fault_metadata(chunk.text)
            code = fault_meta.get("fault_code")
            if not code:
                continue
            entry = {
                "fault_code": code,
                "document_name": chunk.document_name,
                "page": chunk.section,
                "chunk_index": chunk.chunk_index,
                "snippet": chunk.text,
                "system": file_meta.get("system", "unknown"),
                "subsystem": file_meta.get("subsystem", "unknown"),
                **fault_meta,
            }
            index.setdefault(code, []).append(entry)
    return index


def buscar_codigo_falla(code: str, subsystem_hint: str | None = None) -> Optional[dict]:
    """
    Busca ficha exacta por código principal en los Markdown locales.
    Si hay varias coincidencias, prioriza subsystem_hint y luego infer_subsystem_hints.
    """
    normalized = code.strip().upper() if re.search(r"[A-Fa-f]", code) else code.strip()
    matches = _load_index().get(normalized, [])
    if not matches:
        return None
    if len(matches) == 1:
        return matches[0]

    hints = ([subsystem_hint] if subsystem_hint else []) + infer_subsystem_hints(normalized)
    for hint in hints:
        for entry in matches:
            if entry.get("subsystem") == hint:
                return entry
    return matches[0]


def formatear_contexto_falla(entry: dict) -> str:
    """Bloque estructurado de prioridad máxima para el LLM."""
    return (
        f"[DATOS ESTRUCTURADOS — Código de falla {entry['fault_code']} — PRIORIDAD MÁXIMA]\n"
        f"Sistema: {entry.get('system', '')} / {entry.get('subsystem', '')}\n"
        f"Documento: {entry['document_name']}\n"
        f"Sección: {entry['page']}\n\n"
        f"{entry['snippet']}"
    )


def snippet_contains_code(snippet: str, code: str) -> bool:
    """True si el fragmento contiene el código principal exacto."""
    normalized = code.strip().upper() if re.search(r"[A-Fa-f]", code) else code.strip()
    return bool(
        re.search(
            rf"(?:C[oó]digo principal|principal):\s*{re.escape(normalized)}\b",
            snippet,
            re.IGNORECASE,
        )
    )
