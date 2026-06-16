"""
Lookup service for structured lubricant data (TRS4531, cap. 7).
Returns exact specs from JSON before the vector search runs.
"""
import json
from pathlib import Path
from typing import Optional

_DATA_PATH = Path(__file__).parent.parent / "data" / "lubricantes.json"

with open(_DATA_PATH, encoding="utf-8") as _f:
    _LUBRICANTES: list[dict] = json.load(_f)


def buscar_sistema(question: str) -> Optional[dict]:
    """Return the lubricant system whose keywords appear in the question, or None."""
    q = question.lower()
    for sistema in _LUBRICANTES:
        if any(kw in q for kw in sistema["keywords"]):
            return sistema
    return None


def formatear_contexto(sistema: dict) -> str:
    """Format a lubricant system record as a priority context block for the LLM."""
    spec = sistema["especificacion_principal"]
    normas = " / ".join(sistema["normas_adicionales"])
    if normas:
        spec = f"{spec} / {normas}"

    componentes = ", ".join(sistema["componentes"])
    return (
        f"[DATOS ESTRUCTURADOS — Tabla lubricantes cap. {sistema['capitulo']}, "
        f"pág. {sistema['pagina']} — PRIORIDAD MÁXIMA]\n"
        f"Sistema: {sistema['sistema']} ({componentes})\n"
        f"Capacidad: {sistema['capacidad_litros']} L\n"
        f"Especificación: {spec}\n"
        f"Nota del manual: nota {sistema['nota_manual']}\n"
        f"Documento: {sistema['documento']}"
    )
