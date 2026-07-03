"""Detección de consultas sobre manual de repuestos TRS4531."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

PART_NUMBER_RE = re.compile(r"\b(\d{2}\.\d{2}\.[0-9A-Za-z]+)\b")
DRAWING_NUMBER_RE = re.compile(
    r"(?:dibujo|drawing|figura|fig\.?)\s*(\d{2}\.\d{3})\b",
    re.IGNORECASE,
)
DRAWING_BARE_RE = re.compile(r"\b(\d{2}\.\d{3})\b")
POSITION_RE = re.compile(
    r"(?:pos(?:ici[oó]n|\.)?|pos\.?)\s*(\d{1,3})\b",
    re.IGNORECASE,
)

_SPARE_KEYWORDS = frozenset({
    "repuesto", "repuestos", "pieza", "piezas", "parte", "partes",
    "número de parte", "numero de parte", "nro de parte", "nro. de parte",
    "part-no", "part no", "part number", "part-number", "part no.",
    "manual de repuestos", "catálogo de partes", "catalogo de partes",
    "lista de partes", "designación", "designacion", "designation",
    "dibujo", "drawing number", "figura", "cantidad instalada",
    "replaced by", "reemplazado por", "catálogo", "catalogo",
    "spare part", "spare parts", "peça", "peças",
})

_CHAPTER_BY_KEYWORD: dict[str, str] = {
    "chasis": "01", "chassis": "01", "frame": "01",
    "cabina": "02", "cab": "02", "cabine": "02",
    "eléctrico": "03", "electrico": "03", "electrical": "03", "elétrico": "03",
    "motor": "04", "engine": "04",
    "refrigeración": "05", "refrigeracion": "05", "cooling": "05", "refrigeração": "05",
    "transmisión": "06", "transmision": "06", "gearbox": "06", "caja de cambios": "06",
    "eje frontal": "07", "front axle": "07", "eixo dianteiro": "07",
    "frenos": "08", "freno": "08", "brake": "08", "travagem": "08",
    "eje de dirección": "09", "eje de direccion": "09", "steering axle": "09",
    "hidráulico": "10", "hidraulico": "10", "hydraulic": "10",
    "pluma": "11", "boom": "11",
    "spreader": "12", "manipulador": "12",
    "calefacción": "13", "calefaccion": "13", "aire acondicionado": "13",
    "heater": "13", "air conditioner": "13",
    "engrase": "14", "grease": "14", "graxa": "14",
    "implementos": "15", "attachments": "15",
    "herramientas": "16", "special tools": "16", "ferramentas": "16",
}


@dataclass
class SparePartsQuery:
    is_spare_parts_question: bool = False
    part_number: str | None = None
    drawing_number: str | None = None
    position: str | None = None
    chapter: str | None = None
    search_text: str | None = None
    matched_keywords: list[str] = field(default_factory=list)


def _detect_chapter(question: str) -> str | None:
    q = question.lower()
    for keyword, chapter in _CHAPTER_BY_KEYWORD.items():
        if keyword in q:
            return chapter
    return None


def parse_spare_parts_query(question: str) -> SparePartsQuery:
    q = question.strip()
    q_lower = q.lower()
    result = SparePartsQuery()

    part_match = PART_NUMBER_RE.search(q)
    if part_match:
        result.part_number = part_match.group(1)
        result.is_spare_parts_question = True

    draw_match = DRAWING_NUMBER_RE.search(q)
    if draw_match:
        result.drawing_number = draw_match.group(1)
        result.is_spare_parts_question = True
    elif not result.drawing_number:
        bare = DRAWING_BARE_RE.findall(q)
        # Evitar confundir códigos de falla tipo 85.01 con dibujos 08.001
        for candidate in bare:
            if candidate.startswith(("08.", "01.", "06.", "07.", "09.", "10.", "11.", "12.", "13.")):
                result.drawing_number = candidate
                result.is_spare_parts_question = True
                break

    pos_match = POSITION_RE.search(q)
    if pos_match:
        result.position = pos_match.group(1)
        result.is_spare_parts_question = True

    matched = [kw for kw in _SPARE_KEYWORDS if kw in q_lower]
    if matched:
        result.matched_keywords = matched
        result.is_spare_parts_question = True

    chapter = _detect_chapter(q)
    if chapter:
        result.chapter = chapter
        if any(kw in q_lower for kw in ("repuesto", "repuestos", "pieza", "parte", "dibujo", "part number", "número de parte", "numero de parte", "catálogo", "catalogo", "lista de partes")):
            result.is_spare_parts_question = True

    if result.is_spare_parts_question:
        parts = []
        if result.part_number:
            parts.append(f"TRS4531 part number {result.part_number}")
        if result.drawing_number:
            parts.append(f"drawing {result.drawing_number}")
        if result.chapter:
            parts.append(f"chapter {result.chapter}")
        parts.append(q)
        result.search_text = " ".join(parts)

    return result
