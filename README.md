# Life OS

Plataforma personal de productividad — un "Notion propio" con tareas, notas,
finanzas y foco, pensada para uso diario de un solo usuario. Proyecto
personal / experimento, código abierto.

## Módulos

- **Data Center**: páginas tipo Notion (editor de bloques) + tareas tipo
  Asana (proyectos, subtareas, estados, vistas) + generación de PRs y
  documentación técnica desde una tarea.
- **Libreta**: notas rápidas tipo journal, con tags y buscador. Pensada como
  PWA instalable para captura desde cualquier dispositivo.
- **Finanzas**: cuentas, movimientos, categorías, presupuestos y dashboard
  de gasto.
- **Foco**: timer Pomodoro + playlist de jazz (embed) + fondos de
  yoga/concentración, combinables en una "sesión de foco".

## Stack

- **Next.js 16** (App Router, Turbopack por defecto) en Vercel.
- **Supabase**: Postgres + Auth (magic link) + Storage.
- **Drizzle ORM** sobre el Postgres de Supabase.
- **Tailwind CSS v4**. shadcn/ui se suma más adelante (ver nota abajo).
- **Yoopta-Editor** para el editor de bloques del Data Center y la Libreta —
  MIT, construido sobre Slate.js, exporta a Markdown/HTML. Soporta atajos
  tipo markdown (`# `, `## `, `- `, etc.) y de teclado (`Cmd+B`, `Cmd+I`, …)
  sin necesitar UI extra. La barra flotante/menú `/` de `@yoopta/ui` queda
  pendiente (ver Notas técnicas).

## Roadmap

- **Fase 0 (hecho)**: scaffold del proyecto, Supabase auth (magic link),
  shell de navegación, manifest PWA básico, config de Drizzle.
- **Fase 1 (hecho)**: Data Center (páginas con editor de bloques + tareas
  tipo Asana con proyectos y estados) + Libreta (notas con tags y buscador)
  + Pomodoro configurable.
- **Fase 2**: Finanzas + música/yoga embebidos.
- **Fase 3**: integración con GitHub (crear PRs desde tareas), Google
  Calendar, generación de docs técnicas con IA (Claude API).
- **Fase 4**: personalización (temas, layout de widgets), reportes.

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local  # completar con tu proyecto de Supabase
npm run dev
```

Life OS **comparte el proyecto de Supabase** de `behavioral-design-platform`
(por el límite de proyectos gratis) — no hace falta crear uno nuevo:

1. Auth → Providers → Email → confirmar que "magic link" esté habilitado
   (ya debería estarlo si esa app lo usa).
2. Auth → URL Configuration → **agregar** (sin borrar las existentes) a
   "Redirect URLs": `http://localhost:3000/auth/callback` y, cuando exista,
   la URL de producción de Vercel.
3. Copiar `Project URL` y `anon public key` (Project Settings → API) a
   `.env.local` — son los mismos valores que usa `behavioral-design-platform`.
4. Copiar el connection string del pooler (modo "Transaction", Project
   Settings → Database) a `DATABASE_URL`.

Las tablas de Life OS viven en su propio schema de Postgres (`life_os`, ver
`src/db/schema.ts`), separado del `public.projects` de la otra app — así que
compartir proyecto no mezcla los datos. Si más adelante esto crece y querés
separarlo del todo, migrar es un `pg_dump --schema=life_os` a un proyecto
nuevo.

## Base de datos

Las tablas (`life_os.projects`, `tasks`, `pages`, `notes`) todavía no están
creadas en Supabase — el schema vive en `src/db/schema.ts` pero falta
aplicarlo. Dos formas de hacerlo:

- **Rápido (una vez):** pegar el contenido de
  `src/db/migrations/0000_polite_thena.sql` en Supabase → SQL Editor → New
  query, y correrlo. Mismo flujo que ya usás para
  `behavioral-design-platform/supabase/schema.sql`.
- **Con Drizzle (para cambios futuros de schema):** con `DATABASE_URL`
  cargado en `.env.local`, `npm run db:generate` genera la migración y
  `npm run db:migrate` la aplica.

## Deploy en Vercel

1. Importar este repo en [vercel.com/new](https://vercel.com/new).
2. Cargar las mismas variables de entorno de `.env.local.example` en
   Project Settings → Environment Variables (`NEXT_PUBLIC_SITE_URL` con la
   URL real de producción).
3. En Supabase, Auth → URL Configuration → agregar la URL de Vercel a
   "Redirect URLs" (`https://tu-dominio.vercel.app/auth/callback`).

## Notas técnicas

- Next.js 16 renombró `middleware.ts` a `proxy.ts` — vive en `src/proxy.ts`
  (no en la raíz) por usar `--src-dir`. Se encarga de refrescar la sesión
  de Supabase y redirigir a `/login` si no hay usuario.
- `cookies()`, `params` y `searchParams` son siempre async en esta versión.
- El CLI de `shadcn` no pudo correr en el entorno donde se armó el scaffold
  inicial (proxy de red bloqueaba `ui.shadcn.com`). Los componentes se
  pueden sumar después con `npx shadcn add <componente>` desde un entorno
  con esa red disponible.
- El ícono de `public/icon.svg` es un placeholder — conviene reemplazarlo
  por un ícono real (y sumar versiones PNG 192/512 para mejor soporte en
  iOS) antes de instalar la PWA en el celular.
- El plugin de imágenes de Yoopta (`@yoopta/image`) y la tabla (`@yoopta/table`)
  quedaron afuera del set de Fase 1 a propósito — requieren wirear upload a
  Supabase Storage, que es su propio pedacito de trabajo. Se suman cuando
  haga falta.
- `@yoopta/ui` (`FloatingToolbar`, `SlashCommandMenu`, `FloatingBlockActions`)
  no se integró todavía: son componentes compuestos (patrón Root/Content/Item,
  no un drop-in) que requieren armar la lista de botones/comandos a mano. El
  editor ya es usable sin eso (atajos markdown + de teclado), pero mejora
  mucho la UX — buen próximo incremento.
- Todas las queries a la base pasan por Drizzle con conexión directa a
  Postgres (`DATABASE_URL`), no por la REST API de Supabase — o sea que las
  políticas de RLS (si algún día se agregan) NO protegen estas tablas. Cada
  server action en `actions.ts` filtra a mano por `user_id` del usuario
  autenticado; cualquier query nueva tiene que seguir ese mismo patrón.
