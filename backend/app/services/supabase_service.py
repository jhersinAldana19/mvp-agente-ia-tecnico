import uuid
from datetime import datetime, timezone
from typing import List, Optional

from supabase import Client, create_client

from app.core.config import settings
from app.schemas.chat import ChatSessionSummary
from app.schemas.source import SourceItem
from app.schemas.user import UserProfile, UserRole


def _client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


class SupabaseService:
    """Todos los accesos a base de datos pasan por esta clase."""

    def __init__(self) -> None:
        self._db = _client()

    # ------------------------------------------------------------------
    # Profiles
    # ------------------------------------------------------------------

    def get_profile(self, user_id: str) -> Optional[UserProfile]:
        result = (
            self._db.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return UserProfile(**result.data) if result.data else None

    def list_profiles(self) -> List[UserProfile]:
        result = (
            self._db.table("profiles")
            .select("*")
            .order("created_at", desc=False)
            .execute()
        )
        return [UserProfile(**u) for u in (result.data or [])]

    def update_role(self, user_id: str, role: UserRole) -> UserProfile:
        result = (
            self._db.table("profiles")
            .update({"role": role.value, "updated_at": _now()})
            .eq("id", user_id)
            .execute()
        )
        return UserProfile(**result.data[0])

    # ------------------------------------------------------------------
    # Chat sessions
    # ------------------------------------------------------------------

    def create_session(self, user_id: str, title: str) -> str:
        session_id = str(uuid.uuid4())
        self._db.table("chat_sessions").insert(
            {"id": session_id, "user_id": user_id, "title": title[:120]}
        ).execute()
        return session_id

    def get_user_sessions(self, user_id: str) -> List[dict]:
        result = (
            self._db.table("chat_sessions")
            .select("id, title, created_at, chat_messages(sources)")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        rows = result.data or []
        sessions = []
        for row in rows:
            messages = row.pop("chat_messages", []) or []
            source_count = sum(
                len(m.get("sources") or []) for m in messages if m.get("sources")
            )
            sessions.append({**row, "source_count": source_count})
        return sessions

    def get_session_messages(self, session_id: str, user_id: str) -> List[dict]:
        result = (
            self._db.table("chat_messages")
            .select("*")
            .eq("session_id", session_id)
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        return result.data or []

    # ------------------------------------------------------------------
    # Chat messages
    # ------------------------------------------------------------------

    def save_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        sources: Optional[List[SourceItem]] = None,
    ) -> None:
        self._db.table("chat_messages").insert(
            {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "user_id": user_id,
                "role": role,
                "content": content,
                "sources": [s.model_dump() for s in sources] if sources else None,
            }
        ).execute()

    # ------------------------------------------------------------------
    # Admin
    # ------------------------------------------------------------------

    def get_global_history(
        self, search: str = "", date_from: str = "", date_to: str = ""
    ) -> List[dict]:
        query = (
            self._db.table("chat_messages")
            .select("id, content, created_at, user_id")
            .eq("role", "user")
            .order("created_at", desc=True)
            .limit(200)
        )
        if search:
            query = query.ilike("content", f"%{search}%")
        if date_from:
            query = query.gte("created_at", date_from)
        if date_to:
            query = query.lte("created_at", date_to)
        messages = query.execute().data or []

        if not messages:
            return []

        # Fetch profiles separately — chat_messages.user_id references auth.users,
        # not public.profiles, so PostgREST can't resolve the join automatically.
        user_ids = list({m["user_id"] for m in messages})
        profiles_result = (
            self._db.table("profiles")
            .select("id, full_name, email")
            .in_("id", user_ids)
            .execute()
        )
        profiles_by_id = {p["id"]: p for p in (profiles_result.data or [])}

        return [
            {**m, "profiles": profiles_by_id.get(m["user_id"])}
            for m in messages
        ]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
