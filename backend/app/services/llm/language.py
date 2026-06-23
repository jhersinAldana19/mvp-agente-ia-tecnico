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
        (r"\b(codigo|código|falla|alarma|significa|dime|error)\b", 2),
        (r"[¿¡áéíóúüñ]", 3),
        (r"\b(el|la|los|las|del|al|un|una|este|esta|para|con|por)\b", 1),
    ),
    "en": (
        (r"\b(what|how|which|where|when|why|does|do|is|are|the|engine|model|maintenance|brake|oil|tire|safety|use|has|have|specification|capacity|power|mean|means)\b", 2),
        (r"\b(fault code|error code|what is|what does)\b", 3),
        (r"\b(the|this|that|with|from|for|about)\b", 1),
    ),
    "pt": (
        (r"\b(qual|quais|como|onde|quando|por que|porque|possui|usa|freio|óleo|oleo|pneu|manutenção|manutencao|segurança|seguranca|motor|transmissão|transmissao|especificação|especificacao|capacidade|potência|potencia)\b", 2),
        (r"\b(codigo de erro|codigo de falha|o codigo|o código|erro|falha)\b", 2),
        (r"\b(não|nao|você|voce|também|tambem|este|esta|para|com|por)\b", 1),
        (r"[ãõç]", 3),
    ),
}

# Spanish without accents — common in quick technical queries.
_ES_PLAIN = re.compile(
    r"\b("
    r"codigo|código|falla|alarma|significa|dime|"
    r"que es|que significa|de error|de falla|el error|el codigo|el código"
    r")\b",
    re.IGNORECASE,
)

# Portuguese without accents.
_PT_PLAIN = re.compile(
    r"\b("
    r"codigo de erro|codigo de falha|o codigo|o código|"
    r"qual e|qual é"
    r")\b",
    re.IGNORECASE,
)

# Clear English phrasing (avoid matching bare "error" shared with Spanish).
_EN_STRONG = re.compile(
    r"\b("
    r"what|how|which|where|when|why|does|did|"
    r"fault code|error code|what is|what does|what's|"
    r"the engine|tell me|can you|please explain"
    r")\b",
    re.IGNORECASE,
)


def detect_language(text: str) -> Language:
    q = text.strip().lower()
    if not q:
        return "es"

    # Portuguese exclusive (diacritics or unmistakable PT words).
    if re.search(r"[ãõç]", q) or re.search(
        r"\b(qual|quais|não|nao|você|voce|manutenção|manutencao|possui|freio|óleo|oleo|pneu|o que)\b",
        q,
        re.IGNORECASE,
    ):
        return "pt"

    # English exclusive — must be unambiguous English phrasing.
    if _EN_STRONG.search(q):
        return "en"

    # Portuguese without accents — before Spanish (shared "codigo").
    if _PT_PLAIN.search(q):
        return "pt"

    # Spanish with accents or unmistakable Spanish words.
    if re.search(r"[¿¡áéíóúüñ]", q) or re.search(
        r"\b(qué|cómo|cuál|cuánto|dónde|tiene|mantenimiento)\b",
        q,
        re.IGNORECASE,
    ):
        return "es"

    # Spanish without accents (e.g. "codigo error 85.00").
    if _ES_PLAIN.search(q):
        return "es"

    scores = {lang: 0 for lang in _MARKERS}
    for lang, patterns in _MARKERS.items():
        for pattern, weight in patterns:
            if re.search(pattern, q, re.IGNORECASE):
                scores[lang] += weight

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        # Default español — no inferir inglés solo por texto ASCII.
        return "es"
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
            "Los fragmentos recuperados pueden estar en español o inglés: tradúcelos fielmente "
            "al español sin cambiar valores técnicos, unidades, códigos ni nombres de componentes. "
            "No inventes información al traducir."
        ),
        "en": (
            "Write the ENTIRE response in English, including section headers "
            '("Answer:", "Key points:", "Source:"). '
            "Retrieved excerpts may be in Spanish or English: translate them faithfully "
            "into English without changing technical values, units, codes, or component names. "
            "Do not invent information when translating."
        ),
        "pt": (
            "Redija TODA a resposta em português, incluindo os títulos das seções "
            '("Resposta:", "Pontos importantes:", "Fonte:"). '
            "Os trechos recuperados podem estar em espanhol ou inglês: traduza-os fielmente "
            "para português sem alterar valores técnicos, unidades, códigos ou nomes de componentes. "
            "Não invente informação ao traduzir."
        ),
    }
    return instructions[lang]
