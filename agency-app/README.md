# Panel de Agencia

App para gestionar clientes, proyectos y el portal de cliente. Construida con
Next.js 16 + Supabase (base de datos, login y storage de archivos).

Este es el **Fase 1**: portal de cliente + lo mínimo de gestión de proyectos
para poder cargar clientes/proyectos/tareas. Las próximas fases agregan BI de
Meta/Google Ads, control de horas, y el Kanban/Gantt completo.

## 1. Crear el proyecto en Supabase

1. Andá a https://supabase.com, creá una cuenta gratis y un proyecto nuevo.
2. En **SQL Editor**, pegá y ejecutá, en este orden, el contenido de:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_storage.sql`
3. En **Project Settings → API**, copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (Settings → API → "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`
     (esta es secreta, nunca la compartas ni la pongas en el frontend)

## 2. Configurar variables de entorno

Copiá `.env.local.example` a `.env.local` y completá los tres valores de
arriba. Dejá vacías las de Meta/Google por ahora (fase 2).

```bash
cp .env.local.example .env.local
```

## 3. Correr en local

```bash
npm install
npm run dev
```

Abrí http://localhost:3000, hacé clic en "¿No tenés cuenta? Creá una" y
registrate con tu email — ese primer usuario queda como parte del equipo de
la agencia (no como cliente) automáticamente.

## 4. Cómo se usa

- **Vos (agencia)**: entrás por `/app`. Creás clientes en "Clientes", después
  proyectos, después tareas dentro de cada proyecto. Cada tarea tiene un
  checkbox "Visible para el cliente" — solo esas tareas y sus comentarios
  marcados como visibles aparecen en el portal.
- **Invitar a un cliente**: entrás a la ficha del cliente (`/app/clients/id`)
  y lo invitás por email. Le llega un mail de Supabase con un link para crear
  su contraseña; después entra por el mismo login y ve solo su portal
  (`/portal`), nunca el panel interno.
- **Entregables y proofing**: subís una imagen como entregable dentro de una
  tarea. El cliente puede aprobarla, pedir cambios, y hacer clic directo
  sobre la imagen para dejar una corrección puntual en un punto exacto.

## 5. Publicarla online (deploy)

Recomendado: **Vercel**, gratis para este tamaño de proyecto.

1. Este código vive en la rama `claude/agency-management-app-mo6li2` del
   repo `TACHCAJA`, en la carpeta `agency-app/`. No toca nada del archivo
   `tach_racing_caja.html` que ya usás para otra cosa.
2. Entrá a https://vercel.com, "Add New Project", conectá tu cuenta de
   GitHub e importá el repo `TACHCAJA`.
3. En "Root Directory" elegí `agency-app`.
4. En "Environment Variables" cargá las mismas tres variables del paso 2, más
   `NEXT_PUBLIC_SITE_URL` con la URL que Vercel te va a asignar (por ejemplo
   `https://tu-proyecto.vercel.app`) — la necesita el envío de invitaciones.
5. Deploy. Cada vez que se suba código nuevo a esa rama, Vercel lo publica
   solo.

## Estructura

```
src/app/(staff)/app/…      panel interno (equipo de la agencia)
src/app/(client)/portal/…  portal de cliente (solo lectura + aprobaciones)
src/app/actions/…          mutaciones (crear cliente, tarea, comentario…)
src/lib/supabase/…         clientes de Supabase (browser, server, admin)
supabase/migrations/…      esquema de base de datos y permisos (RLS)
```

## Qué falta (próximas fases)

- **BI de Ads**: conexión OAuth a Meta Ads y Google Ads, sincronización
  diaria, dashboard de KPIs (CTR, CPC, CPA, ROAS) y "Creative Hub".
- **Time tracking**: cronómetro por tarea, hojas de tiempo semanales,
  capacidad del equipo.
- **Gestión de proyectos completa**: tablero Kanban con drag-and-drop,
  vista Gantt, campos personalizados, automatizaciones.
