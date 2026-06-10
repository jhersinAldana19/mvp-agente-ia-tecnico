# TECPORT AI Agent - Frontend

React + Vite web app para el Agente IA Técnico de TECPORT.

## Stack

- React 18 + Vite
- Tailwind CSS
- React Router v6
- Supabase JS Client
- Axios

## Inicio rápido

```bash
cd frontend

# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
copy .env.example .env
# Edita .env con tus claves reales

# 3. Colocar el logo oficial
# Copia tu logo a: frontend/public/logo-tecport.png

# 4. Correr localmente
npm run dev
```

La app estará disponible en `http://localhost:5173`.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anon de Supabase |
| `VITE_API_BASE_URL` | URL del backend (ej. `http://localhost:8000`) |

## Logo oficial

Coloca el logo de TECPORT en:

```
frontend/public/logo-tecport.png
```

Se mostrará en el login, header del técnico, sidebar del admin y vistas móviles.  
Si no existe el archivo, se muestra un fallback en texto.

## Build y despliegue en Vercel

```bash
npm run build
# Genera la carpeta dist/
```

**Configuración en Vercel**:

| Campo | Valor |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

**Variables de entorno en Vercel**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` → URL del backend en Render

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Login |
| `/chat` | Técnico | Chat con SOFIA |
| `/history` | Técnico | Historial de consultas |
| `/profile` | Técnico | Perfil y cerrar sesión |
| `/admin/history` | Admin | Historial global |
| `/admin/users` | Admin | Gestión de usuarios |

## Paleta de colores

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#003558` | Fondo sidebar, botones, nav activo |
| `primary-hover` | `#004A77` | Hover de botones |
| `primary-light` | `#E8F0F7` | Fondos suaves |
| `surface` | `#F4F6F8` | Fondo general |
| `border` | `#E5E7EB` | Bordes de tarjetas |
| `text-main` | `#111827` | Texto principal |
| `text-muted` | `#6B7280` | Texto secundario |

## Estructura

```
src/
  components/
    Layout/
      TechnicianLayout.jsx  ← Header + nav superior (sin sidebar)
      AdminLayout.jsx        ← Sidebar + área principal
    Chat/
      ChatWindow.jsx         ← Contenedor de mensajes con scroll
      MessageBubble.jsx      ← Burbuja usuario/asistente + fuentes
      ChatInput.jsx          ← Input expandible + botón enviar
    Sources/
      SourceCard.jsx         ← Tarjeta de fuente PDF
      SourceList.jsx         ← Grid de fuentes
    Modal/
      PdfModal.jsx           ← Modal para ver página de PDF
    UI/
      Spinner.jsx
      EmptyState.jsx
  pages/
    LoginPage.jsx
    TechnicianChatPage.jsx
    TechnicianHistoryPage.jsx
    ProfilePage.jsx
    AdminHistoryPage.jsx
    AdminUsersPage.jsx
  services/
    api.js                   ← Axios con interceptor de auth
    supabaseClient.js        ← Cliente Supabase
  context/
    AuthContext.jsx          ← Estado global: session, profile, signOut
  App.jsx                    ← Router + guards por rol
```
