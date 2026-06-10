-- ============================================================
-- TECPORT AI Agent - Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('admin', 'technician')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de sesiones de chat
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'Nueva consulta',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT NOT NULL,
    sources     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id  ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session  ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user     ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created  ON public.chat_messages(created_at DESC);

-- ============================================================
-- Row Level Security (RLS)
-- El backend usa service_role_key que bypasea RLS,
-- pero se define aquí como buena práctica.
-- ============================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- profiles: el usuario solo puede ver/editar su propio perfil
CREATE POLICY "profile_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profile_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- chat_sessions: el usuario solo ve sus propias sesiones
CREATE POLICY "sessions_select_own" ON public.chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON public.chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- chat_messages: el usuario solo ve mensajes de sus sesiones
CREATE POLICY "messages_select_own" ON public.chat_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "messages_insert_own" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Trigger: crear perfil automáticamente al registrar usuario
-- (Opcional - los usuarios también se pueden crear manualmente)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'technician')
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Función para updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
