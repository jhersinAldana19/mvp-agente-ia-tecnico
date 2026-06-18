"""Lightweight language detection for chat responses (es / en / pt)."""

from __future__ import annotations

import re
from typing import Literal

Language = Literal["es", "en", "pt"]

_NO_SOURCES: dict[Language, str] = {
    "es": "No encontré esa información en los documentos técnicos disponibles del TRS4531.",
    "en": "I could not find that information in the available TRS4531 technical documents.",
    "pt": "Não encontrei essa informação nos documentos técnicos disponíveis do TRS4531.",
}

_LANGUAGE_LABELS: dict[Language, str] = {
    "es": "Spanish (español)",
    "en": "English",
    "pt": "Portuguese (português)",
}

# Weighted markers — no external dependency required.
_MARKERS: dict[Language, tuple[tuple[str, int], ...]] = {
    "es": (
        (r"\b(qué|que|cómo|como|cuál|cual|cuánto|cuanto|dónde|donde|tiene|lleva|usa|frenos|aceite|llanta|mantenimiento|seguridad|motor|transmisión|transmision|especificaciones)\b", 2),
        (r"[¿¡]", 3),
        (r"\b(el|la|los|las|del|al|un|una|este|esta|para|con|por)\b", 1),
    ),
    "en": (
        (r"\b(what|how|which|where|when|why|does|do|is|are|the|engine|model|maintenance|brake|oil|tire|safety|use|has|have|specification|capacity|power)\b", 2),
        (r"\b(the|this|that|with|from|for|about)\b", 1),
    ),
    "pt": (
        (r"\b(qual|quais|como|onde|quando|por que|porque|possui|usa|freio|óleo|oleo|pneu|manutenção|manutencao|segurança|seguranca|motor|transmissão|transmissao|especificação|especificacao|capacidade|potência|potencia)\b", 2),
        (r"\b(não|nao|você|voce|também|tambem|este|esta|para|com|por)\b", 1),
        (r"[ãõç]", 3),
    ),
}


def detect_language(text: str) -> Language:
    q = text.strip().lower()
    if not q:
        return "es"

    # Strong exclusive signals first.
    if re.search(r"[ãõç]", q) or re.search(
        r"\b(qual|quais|não|nao|você|voce|manutenção|manutencao|possui|freio|óleo|oleo|pneu)\b",
        q,
        re.IGNORECASE,
    ):
        return "pt"
    if re.search(
        r"\b(what|how|which|where|when|why|does|do|did|is|are|the|engine|maintenance)\b",
        q,
        re.IGNORECASE,
    ):
        return "en"
    if re.search(r"[¿¡]", q) or re.search(
        r"\b(qué|cómo|cuál|cuánto|dónde|tiene|mantenimiento)\b",
        q,
        re.IGNORECASE,
    ):
        return "es"

    scores = {lang: 0 for lang in _MARKERS}
    for lang, patterns in _MARKERS.items():
        for pattern, weight in patterns:
            if re.search(pattern, q, re.IGNORECASE):
                scores[lang] += weight

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        ascii_ratio = sum(1 for c in q if ord(c) < 128) / len(q)
        return "en" if ascii_ratio > 0.95 and re.search(r"\b[a-z]{3,}\b", q) else "es"
    return best  # type: ignore[return-value]


def no_sources_message(lang: Language) -> str:
    return _NO_SOURCES[lang]


def language_label(lang: Language) -> str:
    return _LANGUAGE_LABELS[lang]


def language_instruction(lang: Language) -> str:
    instructions = {
        "es": (
            "Redacta TODA la respuesta en español, incluyendo los encabezados de sección "
            '("Respuesta:", "Puntos importantes:", "Fuente:"). '
            "Los fragmentos recuperados pueden estar en español: interprétalos y responde en español "
            "sin cambiar valores técnicos, unidades ni nombres de componentes."
        ),
        "en": (
            "Write the ENTIRE response in English, including section headers "
            '("Answer:", "Key points:", "Source:"). '
            "Retrieved excerpts may be in Spanish: interpret them and answer in English "
            "without changing technical values, units, or component names."
        ),
        "pt": (
            "Redija TODA a resposta em português, incluindo os títulos das seções "
            '("Resposta:", "Pontos importantes:", "Fonte:"). '
            "Os trechos recuperados podem estar em espanhol: interprete-os e responda em português "
            "sem alterar valores técnicos, unidades ou nomes de componentes."
        ),
    }
    return instructions[lang]
