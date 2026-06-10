from typing import List

from openai import AsyncOpenAI

from app.core.config import settings
from app.schemas.source import SourceItem
from app.services.llm.base import LLMProvider

_SYSTEM_PROMPT = """Eres SOFIA, asistente técnico inteligente de TECPORT para el equipo TRS4531.

REGLAS:
1. Responde ÚNICAMENTE usando la información de los fragmentos proporcionados. No inventes datos.
2. Si los fragmentos contienen información relevante —aunque sea parcial— úsala para responder.
3. Si el tema no aparece en ningún fragmento, responde:
   "Esa información no está en la documentación cargada del TRS4531. Intenta reformular la pregunta."
4. NO escribas "(Fuente X, página Y)" en el texto. Las fuentes se muestran automáticamente.
5. Responde en español, de forma técnica y directa. Máximo 150 palabras.
6. Usa markdown para estructurar:
   - `-` para listas de pasos o características
   - **negrita** para términos técnicos clave
   - Párrafos cortos y separados"""

_NO_SOURCES_RESPONSE = (
    "Esa información no está en la documentación cargada del TRS4531. "
    "Intenta reformular la pregunta."
)


def _build_context(sources: List[SourceItem]) -> str:
    blocks = []
    for i, s in enumerate(sources, 1):
        blocks.append(
            f"[Fragmento {i} — {s.document_name}, p.{s.page} | relevancia: {s.score:.2f}]\n"
            f"{s.snippet}"
        )
    return "\n\n---\n\n".join(blocks)


class OpenAILLMProvider(LLMProvider):
    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate_response(
        self, question: str, context: str, sources: List[SourceItem]
    ) -> str:
        if not sources:
            return _NO_SOURCES_RESPONSE

        user_message = (
            f"Pregunta del técnico: {question}\n\n"
            f"Fragmentos de documentación disponibles:\n\n{_build_context(sources)}"
        )

        response = await self._client.chat.completions.create(
            model=settings.openai_chat_model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_message},
            ],
            temperature=0.15,
            max_tokens=450,
        )
        return response.choices[0].message.content
