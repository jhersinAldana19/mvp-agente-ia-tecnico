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
    avatar_url: Optional[str] = None
