"""Google Drive service - preparado para pipeline de ingestión RAG.

Flujo futuro:
  Google Drive PDFs → extracción → chunks → embeddings → Pinecone
"""
from typing import List

from app.core.config import settings


class DriveService:
    async def list_pdfs(self) -> List[dict]:
        """Lista PDFs de la carpeta configurada en Drive."""
        raise NotImplementedError(
            f"Google Drive no configurado aún. "
            f"Carpeta destino: {settings.google_drive_folder_name}"
        )

    async def download_pdf(self, file_id: str) -> bytes:
        """Descarga un PDF por su ID de Drive."""
        raise NotImplementedError("Integración con Google Drive pendiente.")
