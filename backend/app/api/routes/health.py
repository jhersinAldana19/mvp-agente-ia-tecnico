from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

_DOCUMENTS_ROOT = Path(__file__).resolve().parents[3] / "documents"


def _pdf_count(relative_dir: str) -> int:
    folder = _DOCUMENTS_ROOT / relative_dir
    if not folder.is_dir():
        return 0
    return sum(1 for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ".pdf")


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "TECPORT AI Agent API",
        "documents": {
            "spare_parts_pdfs": _pdf_count("manuales-de-repuestos/trs4531/pdf"),
            "fault_codes_pdfs": _pdf_count("codigos-de-fallas/trs4531/pdf"),
        },
    }
