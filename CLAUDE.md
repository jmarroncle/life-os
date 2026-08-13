@AGENTS.md

# Life OS — contexto del proyecto

Plataforma personal de productividad de un solo usuario (Juan). Es un
experimento propio, código abierto, con foco en uso diario real — no es un
producto para terceros. Ver `README.md` para visión completa, stack y
roadmap por fases.

## Decisiones ya tomadas (no las re-abras sin que el usuario lo pida)

- **Stack**: Next.js 16 (App Router) + Supabase (Postgres/Auth/Storage) +
  Drizzle ORM + Tailwind v4, deploy en Vercel.
- **Auth**: solo magic link (sin password). Un único usuario por ahora.
- **Editor de bloques**: se evaluó y se eligió **Yoopta-Editor** (MIT,
  sobre Slate.js, tema shadcn, exporta a Markdown/HTML) para Data Center y
  Libreta. Todavía no está instalado — se suma en Fase 1.
- **PWA**: manifest básico ya armado (`src/app/manifest.ts`). Offline real
  (service worker) y push notifications quedan para más adelante, no son
  parte del scaffold inicial.
- **shadcn/ui**: el CLI no pudo correr durante el scaffold porque el proxy
  de red del entorno bloqueaba `ui.shadcn.com` (npm sí funcionaba). Antes
  de reintentar, verificar si la red del entorno actual lo permite.
- **Supabase compartido**: por el límite de proyectos free, Life OS usa el
  MISMO proyecto de Supabase que `behavioral-design-platform`, no uno
  propio. Para no mezclar datos, todas las tablas de Life OS van en el
  schema de Postgres `life_os` (ver `src/db/schema.ts`, helper `lifeOs`),
  nunca en `public` (esa app ya tiene `public.projects`). Si algún día se
  separa del todo, es un `pg_dump --schema=life_os` a un proyecto nuevo —
  no reescribir esta decisión sin que el usuario lo pida.

## Convenciones de Next.js 16 en este repo (releer antes de tocar código)

- El proyecto usa `--src-dir`: todo el código de app vive en `src/`.
- `middleware.ts` fue renombrado a `proxy.ts` y **debe** vivir en
  `src/proxy.ts` (no en la raíz) por estar usando `src/`.
- `cookies()`, `headers()`, `params`, `searchParams` son siempre async.
- Turbopack es el bundler por defecto (`next dev` / `next build`).
- Antes de escribir código que toque convenciones de routing, leer la doc
  versionada en `node_modules/next/dist/docs/` — no asumas nada de
  versiones anteriores de Next.js.

## Estructura

- `src/app/(app)/` — rutas protegidas por `proxy.ts`, con el layout del
  sidebar (Inicio, Data Center, Libreta, Finanzas, Foco).
- `src/app/login/` y `src/app/auth/callback/` — fuera del grupo `(app)`,
  sin sidebar.
- `src/lib/supabase/` — clientes browser/server de Supabase.
- `src/db/` — Drizzle: `schema.ts` (vacío a propósito, se llena por fase)
  y `index.ts` (cliente de conexión).

## Estado actual

Fase 0 completa (scaffold). Próximo paso: Fase 1 (Data Center con páginas +
tareas, Libreta, Pomodoro).
