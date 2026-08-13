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
- **Editor de bloques**: **Yoopta-Editor** (MIT, sobre Slate.js, exporta a
  Markdown/HTML), instalado en Fase 1. Componente reutilizable en
  `src/components/block-editor.tsx`. Set de plugins deliberadamente chico
  (paragraph, headings, lists, blockquote, code, link, divider, marks) —
  image/table quedan afuera hasta wirear upload a Supabase Storage.
  `@yoopta/ui` (toolbar flotante, menú `/`) NO está integrado todavía: son
  componentes compuestos (Root/Content/Item, no drop-in), documentado como
  pendiente en el README. No lo agregues sin avisar — es una pieza de UI
  no trivial.
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
- **Foco sin contenido precargado**: a propósito NO hay una playlist de
  jazz ni un video de yoga hardcodeados — un link específico es información
  que no se puede inventar de forma confiable (puede no existir o cambiar).
  `FocusAmbience` deja que el usuario pegue su propio link de Spotify/YouTube
  (audio y video por separado) + ofrece presets de color en CSS puro que no
  dependen de ningún link. No agregues una URL de playlist/video "de
  ejemplo" sin que el usuario la pida — va contra la instrucción de no
  inventar URLs.

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
  - `data-center/` tiene su propio layout con tabs (Páginas/Tareas):
    `data-center/page.tsx` (páginas), `data-center/paginas/[id]/` (editor),
    `data-center/tareas/` (tablero por estado).
  - `libreta/page.tsx` (lista + buscador por `?q=`), `libreta/[id]/`
    (editor de nota con tags).
  - `finanzas/` tiene layout con tabs (Resumen/Movimientos/Cuentas/
    Categorías/Presupuestos). `finanzas/actions.ts` tiene lo compartido
    (cuentas, categorías, `getMonthSummary`); cada subcarpeta con lógica
    propia tiene su propio `actions.ts` (`movimientos/`, `presupuestos/`).
  - `foco/page.tsx` combina `PomodoroTimer` + `FocusAmbience` (los dos
    solo-cliente, sin DB — todo en localStorage).
- `src/app/login/` y `src/app/auth/callback/` — fuera del grupo `(app)`,
  sin sidebar.
- `src/lib/supabase/` — clientes browser/server de Supabase.
- `src/lib/auth.ts` — `requireUser()`, usado en TODAS las server actions
  que tocan la base para scopear por `user_id`.
- `src/lib/tags.ts` — `parseTags()` (helper puro, separado de
  `libreta/actions.ts` porque un archivo `"use server"` solo puede exportar
  funciones async).
- `src/lib/money.ts` — `formatCents`, `parseAmountToCents`, `currentMonth`
  (montos siempre en centavos, ver Decisiones).
- `src/lib/embed.ts` — `toEmbedUrl()`, convierte un link normal de
  Spotify/YouTube a su URL de embed (usado por `FocusAmbience`).
- `src/db/` — Drizzle: `schema.ts` (`projects`, `tasks`, `pages`, `notes`,
  `accounts`, `categories`, `transactions`, `budgets`, todo en el schema
  `life_os`) y `index.ts` (cliente de conexión). Dos migraciones
  (`0000_polite_thena.sql`, `0001_military_major_mapleleaf.sql`) todavía no
  se aplicaron en Supabase (ver README → Base de datos).
- `src/components/block-editor.tsx` — wrapper de Yoopta.
  `entity-editor.tsx` — título + editor + autosave debounced (800ms),
  reutilizado por páginas y notas. `note-editor.tsx` lo extiende con tags.
  `task-board.tsx` — tablero de tareas con estado optimista en cliente.
  `pomodoro-timer.tsx` — timer con settings persistidos en localStorage.
  `focus-ambience.tsx` — presets de color + embeds de audio/video
  personalizables, todo en localStorage (ver Decisiones).

## Patrón de server actions (seguir en todo lo nuevo)

Cada `actions.ts` empieza con `await requireUser()` y todas las queries
filtran por `eq(tabla.userId, user.id)` explícitamente — la conexión de
Drizzle es directa a Postgres (`DATABASE_URL`), NO pasa por PostgREST, así
que RLS no aplica acá. La única barrera de seguridad es este filtro manual.

## Estado actual

Fase 1 y Fase 2 completas: Data Center, Libreta, Pomodoro, Finanzas
(cuentas/categorías/movimientos/presupuestos/resumen) y Foco con fondos
ambientales. Build y lint verificados en cada paso; NO se pudo probar en
runtime contra Supabase real desde el sandbox donde se armó (red bloqueada
a `*.supabase.co`) — probar en local o Vercel antes de asumir que algo
funciona end-to-end. Las dos migraciones SQL todavía no se corrieron en
Supabase (ver README).

Próximo paso: Fase 3 (GitHub, Google Calendar, generación de docs con IA),
o pulir lo ya construido (`@yoopta/ui`, plugin de imágenes) si el uso
diario lo pide primero.
