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

    def list_profiles_with_agent_usage(self) -> List[dict]:
        profiles = self.list_profiles()
        sessions = (
            self._db.table("chat_sessions")
            .select("user_id, created_at")
            .execute()
            .data or []
        )
        usage_by_user: dict = {}
        for session in sessions:
            uid = session["user_id"]
            created = session["created_at"]
            if uid not in usage_by_user:
                usage_by_user[uid] = {"session_count": 0, "last_agent_use_at": created}
            usage_by_user[uid]["session_count"] += 1
            if created > usage_by_user[uid]["last_agent_use_at"]:
                usage_by_user[uid]["last_agent_use_at"] = created

        return [
            {
                **profile.model_dump(),
                "has_used_agent": profile.id in usage_by_user,
                "session_count": usage_by_user.get(profile.id, {}).get("session_count", 0),
                "last_agent_use_at": usage_by_user.get(profile.id, {}).get("last_agent_use_at"),
            }
            for profile in profiles
        ]

    def update_profile(
        self,
        user_id: str,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> UserProfile:
        updates: dict = {"updated_at": _now()}
        if full_name is not None:
            updates["full_name"] = full_name.strip()
        if avatar_url is not None:
            updates["avatar_url"] = avatar_url
        result = (
            self._db.table("profiles")
            .update(updates)
            .eq("id", user_id)
            .execute()
        )
        return UserProfile(**result.data[0])

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
        # One row per chat session (not per question). Text search runs in Python
        # after joining profiles so it can match name, email, title and messages.
        query = (
            self._db.table("chat_sessions")
            .select("id, user_id, title, created_at, updated_at, chat_messages(role, content)")
            .order("created_at", desc=True)
            .limit(500)
        )
        if date_from:
            query = query.gte("created_at", date_from)
        if date_to:
            query = query.lte("created_at", f"{date_to}T23:59:59")
        sessions = query.execute().data or []

        if not sessions:
            return []

        user_ids = list({s["user_id"] for s in sessions})
        profiles_by_id = {
            p["id"]: p
            for p in (
                self._db.table("profiles")
                .select("id, full_name, email, avatar_url")
                .in_("id", user_ids)
                .execute()
                .data or []
            )
        }

        needle = search.strip().lower() if search else ""
        result = []
        for session in sessions:
            messages = session.pop("chat_messages", []) or []
            user_messages = [m for m in messages if m.get("role") == "user"]
            profile = profiles_by_id.get(session["user_id"])

            if needle:
                name = (profile or {}).get("full_name", "") or ""
                email = (profile or {}).get("email", "") or ""
                title = session.get("title", "") or ""
                contents = " ".join(m.get("content", "") for m in user_messages)
                haystack = f"{name} {email} {title} {contents}".lower()
                if needle not in haystack:
                    continue

            result.append({
                **session,
                "question_count": len(user_messages),
                "message_count": len(messages),
                "profiles": profile,
            })
        return result


    def get_session_messages_admin(self, session_id: str) -> List[dict]:
        """Admin: obtiene todos los mensajes de una sesión sin restricción de user_id."""
        result = (
            self._db.table("chat_messages")
            .select("id, role, content, sources, created_at")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .execute()
        )
        return result.data or []


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
