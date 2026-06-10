from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.schemas.user import UserProfile
from app.services.supabase_service import SupabaseService

router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    service = SupabaseService()
    profile = service.get_profile(current_user["id"])
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil no configurado. Contacte al administrador.",
        )
    return profile
