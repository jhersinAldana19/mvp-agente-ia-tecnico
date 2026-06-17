from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user
from app.schemas.user import AdminUserProfile, UpdateRoleRequest, UserProfile, UserRole
from app.services.supabase_service import SupabaseService

router = APIRouter()


def _get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user


def _assert_admin(db: SupabaseService, user_id: str) -> None:
    profile = db.get_profile(user_id)
    if not profile or profile.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores.",
        )


@router.get("/history", response_model=List[dict])
async def get_global_history(
    search: str = Query(""),
    date_from: str = Query(""),
    date_to: str = Query(""),
    current_user: dict = Depends(_get_admin_user),
):
    db = SupabaseService()
    _assert_admin(db, current_user["id"])
    return db.get_global_history(search, date_from, date_to)


@router.get("/users", response_model=List[AdminUserProfile])
async def list_users(current_user: dict = Depends(_get_admin_user)):
    db = SupabaseService()
    _assert_admin(db, current_user["id"])
    return db.list_profiles_with_agent_usage()


@router.get("/sessions/{session_id}", response_model=List[dict])
async def get_session_detail(
    session_id: str,
    current_user: dict = Depends(_get_admin_user),
):
    db = SupabaseService()
    _assert_admin(db, current_user["id"])
    return db.get_session_messages_admin(session_id)


@router.patch("/users/{user_id}/role", response_model=UserProfile)
async def update_user_role(
    user_id: str,
    body: UpdateRoleRequest,
    current_user: dict = Depends(_get_admin_user),
):
    db = SupabaseService()
    _assert_admin(db, current_user["id"])
    return db.update_role(user_id, body.role)
