from typing import List

from app.schemas.source import SourceItem
from app.services.llm.base import LLMProvider

_DEFAULT_ANSWER = (
    "Esta respuesta es simulada mientras se conecta el proveedor IA real. "
    "Configure LLM_PROVIDER=openai en su .env para respuestas reales."
)

_KEYWORD_ANSWERS = {
    "joystick": (
        "El joystick del TRS4531 permite realizar maniobras como elevar y descender el "
        "spreader, extender y retraer el brazo telescópico, inclinar el spreader y "
        "desplazarlo lateralmente. Asegúrate de operar siempre dentro de los parámetros "
        "seguros indicados en el manual. Esta respuesta es simulada."
    ),
    "mantenimiento": (
        "El mantenimiento diario del TRS4531 incluye: verificar niveles de aceite y "
        "fluidos hidráulicos, inspeccionar cables y conectores eléctricos, revisar el "
        "estado del spreader y twistlocks, y limpiar filtros de aire. Esta respuesta es simulada."
    ),
    "carga": (
        "La capacidad de carga máxima del TRS4531 es de 41 toneladas en configuración "
        "estándar. Para cargas especiales consulte la tabla de capacidades en el capítulo 3 "
        "del manual de operación. Esta respuesta es simulada."
    ),
}

MOCK_SOURCES = [
    SourceItem(
        document_name="cap5-uso-del-equipo-trs4531.pdf",
        page=22,
        score=0.92,
        snippet="Sección 4.2 - Funciones del joystick y maniobras del equipo.",
        page_image_url="/mock/pdf-pages/cap5-page-22.png",
    ),
    SourceItem(
        document_name="oper-operacion-rs451-es.pdf",
        page=18,
        score=0.87,
        snippet="Sección 5.1 - Operación del spreader y controles del operador.",
        page_image_url="/mock/pdf-pages/oper-page-18.png",
    ),
    SourceItem(
        document_name="opgk-operations-rs451-3oa7.pdf",
        page=55,
        score=0.81,
        snippet="Sección 8.6 - Parámetros de seguridad y límites operacionales.",
        page_image_url="/mock/pdf-pages/opgk-page-55.png",
    ),
]


class MockLLMProvider(LLMProvider):
    async def generate_response(
        self, question: str, context: str, sources: List[SourceItem]
    ) -> str:
        q_lower = question.lower()
        for keyword, answer in _KEYWORD_ANSWERS.items():
            if keyword in q_lower:
                return answer
        return f"Respuesta simulada para: «{question}». {_DEFAULT_ANSWER}"
