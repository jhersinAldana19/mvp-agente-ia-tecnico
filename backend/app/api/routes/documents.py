"""Endpoint para servir archivos PDF de backend/documents/ (protegido por JWT)."""
import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from app.core.security import get_current_user

router = APIRouter()

_DOCUMENTS_ROOT = Path(__file__).resolve().parents[3] / "documents"


def _safe_path(relative: str) -> Path:
    """Resuelve la ruta y verifica que no salga de _DOCUMENTS_ROOT (path traversal)."""
    resolved = (_DOCUMENTS_ROOT / relative).resolve()
    if not str(resolved).startswith(str(_DOCUMENTS_ROOT.resolve())):
        raise HTTPException(status_code=400, detail="Ruta no permitida.")
    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado.")
    return resolved


@router.get("/file")
async def serve_document(
    path: str = Query(..., description="Ruta relativa dentro de documents/"),
    _user: dict = Depends(get_current_user),
):
    """Sirve un PDF desde backend/documents/<path>. Requiere autenticación."""
    file_path = _safe_path(path)
    media_type, _ = mimetypes.guess_type(str(file_path))
    return FileResponse(
        path=str(file_path),
        media_type=media_type or "application/octet-stream",
        headers={"Content-Disposition": "inline"},
    )
