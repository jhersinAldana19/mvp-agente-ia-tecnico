from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class UserRole(str, Enum):
    admin = "admin"
    technician = "technician"


class UserProfile(BaseModel):
    id: str
    full_name: str
    email: str
    role: UserRole
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class UpdateRoleRequest(BaseModel):
    role: UserRole


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class AdminUserProfile(UserProfile):
    has_used_agent: bool = False
    session_count: int = 0
    last_agent_use_at: Optional[datetime] = None
