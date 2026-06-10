from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class UserRole(str, Enum):
    admin = "admin"
    technician = "technician"


class UserProfile(BaseModel):
    id: str
    full_name: str
    email: str
    role: UserRole
    created_at: datetime
    updated_at: datetime


class UpdateRoleRequest(BaseModel):
    role: UserRole
