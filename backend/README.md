# TECPORT AI Agent - Backend

FastAPI backend para el Agente IA Técnico de TECPORT.

## Stack

- Python 3.11+
- FastAPI + Uvicorn
- Supabase Auth + PostgreSQL
- OpenAI (chat + embeddings)
- Pinecone (vector store)
- Google Drive API (preparado para ingestión RAG)

## Inicio rápido

```bash
cd backend

# 1. Crear entorno virtual
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar variables de entorno
copy .env.example .env
# Edita .env con tus claves reales

# 4. Correr localmente
uvicorn app.main:app --reload
```

La API estará disponible en `http://localhost:8000`.  
Documentación Swagger: `http://localhost:8000/docs` (solo en `ENVIRONMENT=development`).

## Variables de entorno

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (bypasea RLS) |
| `SUPABASE_ANON_KEY` | Clave anon (para verificar JWTs) |
| `PINECONE_API_KEY` | API key de Pinecone |
| `PINECONE_INDEX_NAME` | Nombre del índice Pinecone |
| `PINECONE_NAMESPACE` | Namespace del índice |
| `OPENAI_API_KEY` | API key de OpenAI |
| `OPENAI_CHAT_MODEL` | Modelo de chat (ej. `gpt-4.1-mini`) |
| `OPENAI_EMBEDDING_MODEL` | Modelo de embeddings (ej. `text-embedding-3-small`) |
| `LLM_PROVIDER` | `mock` o `openai` |
| `EMBEDDING_PROVIDER` | `mock` o `openai` |
| `FRONTEND_URL` | URL del frontend (para CORS) |

## Cambiar de mock a OpenAI

En tu `.env`:

```env
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Reinicia el servidor. Sin cambiar ningún otro código.

## Base de datos (Supabase)

1. Abre tu proyecto Supabase > SQL Editor
2. Ejecuta el contenido de `supabase_schema.sql`
3. Esto crea las tablas `profiles`, `chat_sessions`, `chat_messages` con RLS

### Crear primer usuario

1. En Supabase Dashboard > Authentication > Users > "Add user"
2. El trigger `on_auth_user_created` crea automáticamente el perfil
3. Para asignar rol `admin`, edita la tabla `profiles` directamente:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'tu@email.com';
```

## Configurar Pinecone

El índice ya debe estar creado en Pinecone con:
- **Tipo**: Dense
- **Dimensión**: 1536
- **Métrica**: cosine
- **Región**: us-east-1 (AWS)

Solo necesitas configurar `PINECONE_API_KEY` en tu `.env`.

## Despliegue en Render

**Root Directory**: `backend`

**Build Command**:
```
pip install -r requirements.txt
```

**Start Command**:
```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Configura todas las variables de entorno en Render > Environment.  
`FRONTEND_URL` debe apuntar al dominio de Vercel.

## Estructura

```
app/
  main.py               ← Crea la app FastAPI con CORS y routers
  core/
    config.py           ← Configuración centralizada con pydantic-settings
    security.py         ← Verificación de JWT de Supabase
  api/routes/
    health.py           ← GET /health
    auth.py             ← GET /auth/me
    chat.py             ← POST /chat, GET /chat/history, GET /chat/sessions/{id}
    admin.py            ← GET /admin/history, GET /admin/users, PATCH /admin/users/{id}/role
  services/
    llm/                ← Providers LLM (mock, openai) con patrón factory
    embeddings/         ← Providers embeddings (mock, openai) con patrón factory
    supabase_service.py ← Todas las operaciones de base de datos
    pinecone_service.py ← Búsqueda semántica (preparado para RAG)
    drive_service.py    ← Google Drive (preparado para ingestión)
    pdf_service.py      ← Extracción de texto PDF (preparado)
  schemas/
    source.py           ← SourceItem
    user.py             ← UserProfile, UserRole, UpdateRoleRequest
    chat.py             ← ChatRequest, ChatResponse, ChatSessionSummary
```
