"""Detección de códigos de falla, SPN/FMI y ambigüedad en preguntas de chat."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

_FAULT_KEYWORDS = (
    "código de error", "codigo de error",
    "código de falla", "codigo de falla",
    "código de falha", "codigo de falha",
    "código de erro", "codigo de erro",
    "código", "codigo",
    "error code", "fault code",
    "error", "fault",
    "alarma", "falla", "falha",
)

_SPN_FMI_RE = re.compile(
    r"\bspn\s*[:#]?\s*(\d+)\s+fmi\s*[:#]?\s*(\d+)\b",
    re.IGNORECASE,
)
_FMI_ONLY_RE = re.compile(r"\bfmi\s*[:#]?\s*(\d+)\b", re.IGNORECASE)
_ALNUM_CODE_RE = re.compile(r"\b([0-9]{1,2}[A-Fa-f]\.\d{2})\b")
_DOT_CODE_RE = re.compile(r"\b(\d{1,3}\.\d{2})\b")
_EXPLICIT_CODE_RE = re.compile(
    r"(?:código|codigo|error|falla|fault(?:\s+code)?|error\s+code)"
    r"(?:\s+de\s+(?:error|falla|erro|falha))?"
    r"\s*[:#]?\s*"
    r"([0-9]{1,2}[A-Fa-f]\.\d{2}|\d+(?:\.\d+)?)",
    re.IGNORECASE,
)
_BARE_FAULT_CODE_RE = re.compile(
    r"\b(?:error|fault(?:\s+code)?|error\s+code)\s*[:#]?\s*"
    r"([0-9]{1,2}[A-Fa-f]\.\d{2}|\d+(?:\.\d+)?)",
    re.IGNORECASE,
)
_SHORT_CODE_RE = re.compile(
    r"(?:código|codigo|error|falla)(?:\s+de\s+(?:error|falla|erro|falha))?"
    r"\s*[:#]?\s*(\d{1,2})\b",
    re.IGNORECASE,
)


@dataclass
class FaultCodeQuery:
    is_fault_question: bool = False
    is_ambiguous: bool = False
    ambiguity_reason: str = ""
    primary_code: Optional[str] = None
    spn: Optional[str] = None
    fmi: Optional[str] = None

    @property
    def search_text(self) -> Optional[str]:
        """Texto reformulado para embedding de búsqueda."""
        if self.is_ambiguous:
            return None
        if self.spn and self.fmi:
            return f"SPN {self.spn} FMI {self.fmi} código de falla TRS4531"
        if self.primary_code:
            return f"código de falla {self.primary_code} TRS4531"
        return None


def _normalize_code(code: str) -> str:
    return code.strip().upper() if re.search(r"[A-Fa-f]", code) else code.strip()


def _has_fault_keyword(question: str) -> bool:
    q = question.lower()
    return any(kw in q for kw in _FAULT_KEYWORDS)


def _is_ambiguous_short_code(question: str, code: str) -> bool:
    """Códigos de 1-2 dígitos sin contexto suficiente son ambiguos."""
    if not re.fullmatch(r"\d{1,2}", code):
        return False
    if _SPN_FMI_RE.search(question):
        return False
    if _SHORT_CODE_RE.search(question):
        return True
    return False


def parse_fault_code_query(question: str) -> FaultCodeQuery:
    """
    Analiza la pregunta del usuario para extraer códigos de falla.

    Reglas:
    - SPN + FMI → ambos como filtros de búsqueda.
    - Solo FMI → ambiguo.
    - ``código 3`` / ``código de error 3`` → ambiguo.
    - Códigos numéricos, con punto o alfanuméricos → código principal.
    """
    q = question.strip()
    if not q:
        return FaultCodeQuery()

    result = FaultCodeQuery(is_fault_question=_has_fault_keyword(q))

    spn_fmi = _SPN_FMI_RE.search(q)
    if spn_fmi:
        result.is_fault_question = True
        result.spn = spn_fmi.group(1)
        result.fmi = spn_fmi.group(2)
        return result

    if _FMI_ONLY_RE.search(q) and not result.primary_code:
        result.is_fault_question = True
        result.is_ambiguous = True
        result.ambiguity_reason = (
            "FMI por sí solo no identifica una falla única. "
            "Se necesita el código principal o el SPN."
        )
        return result

  # Códigos explícitos (con palabra clave de falla/error).
    for pattern in (_EXPLICIT_CODE_RE, _BARE_FAULT_CODE_RE):
        match = pattern.search(q)
        if match:
            code = _normalize_code(match.group(1))
            result.is_fault_question = True
            if _is_ambiguous_short_code(q, code):
                result.is_ambiguous = True
                result.ambiguity_reason = (
                    f"El identificador «{code}» es ambiguo: puede confundirse "
                    "con un FMI u otro código incompleto. Indique el código "
                    "completo o el SPN."
                )
            else:
                result.primary_code = code
            return result

    # Códigos con punto o alfanuméricos solo si la pregunta es de fallas.
    if result.is_fault_question:
        for pattern in (_ALNUM_CODE_RE, _DOT_CODE_RE):
            match = pattern.search(q)
            if match:
                code = _normalize_code(match.group(1))
                result.primary_code = code
                return result

    return result


def build_ambiguity_context(parsed: FaultCodeQuery) -> str:
    """Bloque de contexto para el LLM cuando la consulta es ambigua."""
    return (
        "[CONSULTA DE CÓDIGO DE FALLA — AMBIGUA]\n"
        f"{parsed.ambiguity_reason}\n"
        "No asumas un código de falla específico. Pide al usuario el código "
        "completo, el SPN o más contexto del sistema afectado."
    )
