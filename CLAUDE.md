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
  `src/components/block-editor.tsx`. Plugins: paragraph, headings, lists,
  blockquote, code, link, divider, marks, **image**, **table**.
  `@yoopta/ui` (barra flotante de marks al seleccionar texto + menú `/`
  para insertar/convertir bloques) está integrado:
  `block-editor-toolbar.tsx` y `block-editor-slash-menu.tsx`, renderizados
  como `children` de `<YooptaEditor>` (así reciben el contexto vía
  `useYooptaEditor()`, igual que hace la librería internamente). Son
  componentes compuestos (Root/Content/Item), no drop-in — los ítems del
  menú `/` llaman `editor.toggleBlock(<TypeKey>, { focus: true })` para
  bloques de texto (con la key PascalCase de cada plugin: `Paragraph`,
  `HeadingOne`, `BulletedList`, etc., no el tipo de elemento Slate en
  minúscula) o los comandos dedicados `ImageCommands.insertImage` /
  `TableCommands.insertTable` para imagen/tabla. Se desactivan cuando
  `readOnly` es `true`. No se agregó `lucide-react` (no está hoisted en
  node_modules, es una dependencia interna de `@yoopta/ui`) — los botones
  usan texto plano (B/I/U/S) para no sumar una dependencia nueva solo por
  íconos.
- **Imágenes → Supabase Storage**: `src/lib/uploads.ts` (`"use server"`)
  expone `uploadBlockImage(file)`, usado por el plugin `@yoopta/image` vía
  un wrapper client-side en `yoopta-plugins.ts` (`handleImageUpload`) que
  descarta el segundo argumento `onProgress` del plugin antes de llamar a
  la server action — una función no se puede pasar como argumento a una
  server action (no serializa). Sube a un bucket público
  `life-os-uploads`, cada archivo en `<user_id>/<uuid>.<ext>`, con
  policies de storage que limitan insert/delete a la propia carpeta del
  usuario (ver `supabase/storage-setup.sql`, hay que correrlo a mano en
  Supabase — Drizzle no gestiona Storage). No hay borrado del archivo en
  Storage al eliminar el bloque de imagen (queda huérfano) — aceptable
  para uso personal, no lo agregues sin que el usuario lo pida.
- **`@yoopta/table` necesita un cast de tipos**: en `yoopta-plugins.ts`,
  `Table as unknown as YooptaPlugin<Record<string, SlateElement>>` — el
  tipo de `Table` no entra directo en el array heterogéneo de plugins
  porque su `children` interno referencia sus propias 3 claves de
  elemento (table/table-row/table-data-cell), algo que TS no logra
  angostar al tipo genérico que espera `createYooptaEditor`. Es solo una
  limitación de los tipos del paquete, no afecta el runtime.
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
- **GitHub: PAT, no OAuth App**: "Crear PR" usa `GITHUB_TOKEN` (Personal
  Access Token fine-grained) en vez de registrar una GitHub App con OAuth
  — decisión deliberada por ser una herramienta de un solo usuario (mucho
  menos setup). Si esto pasa a multiusuario algún día, ahí sí migrar a
  OAuth App; no lo hagas antes sin que el usuario lo pida.
- **IA: `claude-opus-5`, sin streaming**: `generar/actions.ts` usa
  `@anthropic-ai/sdk` con `claude-opus-5` (el default recomendado salvo que
  el usuario pida otro modelo explícitamente), `max_tokens: 4096`,
  `output_config: {effort: "low"}` (tarea simple, no necesita razonamiento
  profundo). Sin streaming porque la respuesta es corta (1-2 páginas). El
  Markdown se convierte a bloques de Yoopta en el **cliente**
  (`generate-doc-form.tsx`) porque `markdown.deserialize` de
  `@yoopta/exports` necesita `DOMParser` — no corre en un server action de
  Node.
- **Páginas anidadas solo en Data Center, no en Libreta**: `pages` tiene
  `parentId` autoreferenciado (una página puede tener subpáginas, sin
  límite de profundidad — igual que Notion, donde una "carpeta" es una
  página con hijas, no una entidad separada). La Libreta (`notes`)
  deliberadamente NO tiene esto: sigue siendo una lista plana con
  tags+buscador, porque es un cuaderno de captura rápida tipo journal, no
  un wiki jerárquico. No le agregues jerarquía a `notes` sin que el
  usuario lo pida.
- **Google Calendar: OAuth propio, no el conector de la sesión de agente**:
  `src/lib/google-calendar.ts` implementa el flow de OAuth2 a mano (fetch
  directo a `accounts.google.com` / `oauth2.googleapis.com`), independiente
  de cualquier conector de Google que uses vos como usuario en Claude. Solo
  scope `calendar.readonly`, sin escritura.

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
  - `data-center/` tiene su propio layout con tabs (Páginas/Tareas/
    Calendario/Generar con IA): `data-center/page.tsx` (árbol de páginas,
    ver `src/components/page-tree.tsx`), `data-center/paginas/[id]/`
    (editor, con breadcrumb de ancestros y sección de subpáginas),
    `data-center/tareas/` (tablero por estado + `pr-actions.ts` para crear
    PRs), `data-center/calendario/` (Google Calendar, solo lectura),
    `data-center/generar/` (docs con IA).
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
- `src/lib/github.ts` — `githubFetch()`, wrapper fino sobre la REST API de
  GitHub con `GITHUB_TOKEN`.
- `src/lib/google-calendar.ts` — OAuth2 a mano (`buildGoogleAuthUrl`,
  `exchangeCodeForTokens`, `getValidAccessToken` con auto-refresh,
  `listUpcomingEvents`).
- `src/lib/yoopta-plugins.ts` — `plugins`/`marks` compartidos entre
  `block-editor.tsx` y `generate-doc-form.tsx` (este último arma un editor
  temporal solo para `markdown.deserialize`). Incluye `handleImageUpload`,
  el wrapper client-side de `uploadBlockImage`.
- `src/lib/uploads.ts` — `"use server"`, `uploadBlockImage(file)` sube a
  Supabase Storage (bucket `life-os-uploads`) y devuelve la URL pública.
- `supabase/storage-setup.sql` — bucket + policies de Storage, correr a
  mano en Supabase SQL Editor (no lo gestiona Drizzle).
- `src/app/api/google-calendar/connect/` y `.../callback/` — route
  handlers del flow de OAuth (fuera del grupo `(app)` porque no renderizan
  UI, pero igual protegidos por `proxy.ts`).
- `src/db/` — Drizzle: `schema.ts` (`projects`, `tasks`, `pages` —con
  `parentId` autoreferenciado para jerarquía—, `notes`, `accounts`,
  `categories`, `transactions`, `budgets`,
  `google_calendar_connections`, todo en el schema `life_os`) y `index.ts`
  (cliente de conexión). Cinco migraciones (`0000_` a `0004_`, ver
  `src/db/migrations/`) todavía no se aplicaron en Supabase (ver README →
  Base de datos).
- `src/components/block-editor.tsx` — wrapper de Yoopta, monta
  `block-editor-toolbar.tsx` (barra flotante de marks) y
  `block-editor-slash-menu.tsx` (menú `/` de bloques) como children.
  `entity-editor.tsx` — título + editor + autosave debounced (800ms),
  reutilizado por páginas y notas. `note-editor.tsx` lo extiende con tags.
  `page-tree.tsx` — árbol recursivo de páginas (expandir/colapsar,
  resaltado de página activa, "+" para crear subpágina inline), usado en
  `data-center/page.tsx`. `task-board.tsx` — tablero de tareas con estado
  optimista en cliente + botón "Crear PR" por tarea. `pomodoro-timer.tsx`
  — timer con settings persistidos en localStorage. `focus-ambience.tsx`
  — presets de color + embeds de audio/video personalizables, todo en
  localStorage (ver Decisiones). `generate-doc-form.tsx` — form de
  generación de docs con IA.

## Patrón de server actions (seguir en todo lo nuevo)

Cada `actions.ts` empieza con `await requireUser()` y todas las queries
filtran por `eq(tabla.userId, user.id)` explícitamente — la conexión de
Drizzle es directa a Postgres (`DATABASE_URL`), NO pasa por PostgREST, así
que RLS no aplica acá. La única barrera de seguridad es este filtro manual.

## Estado actual

Fase 1, Fase 2 y Fase 3 completas: Data Center (páginas con jerarquía tipo
Notion, tareas, calendario, generación de docs con IA, PRs), Libreta,
Pomodoro, Finanzas, Foco. Editor de bloques con barra flotante, menú `/`,
imágenes (Supabase Storage) y tablas. Build y lint verificados en cada
paso; NO se pudo probar en runtime contra Supabase real ni contra las APIs
de GitHub/Google/Anthropic desde el sandbox donde se armó (red bloqueada a
la mayoría de los dominios externos) — probar en local o Vercel antes de
asumir que algo funciona end-to-end. Las cinco migraciones SQL todavía no
se corrieron en Supabase (ver README → Base de datos), el bucket de
Storage tampoco (ver README → Storage, `supabase/storage-setup.sql`), y
`GITHUB_TOKEN`/`ANTHROPIC_API_KEY`/`GOOGLE_CLIENT_ID`+`GOOGLE_CLIENT_SECRET`
todavía no están configuradas (ver README y `.env.local.example`).

El usuario pidió explícitamente que Life OS sea "casi un clon de Notion":
todas las features clave de Notion tienen que estar presentes, y se van a
seguir sumando features nuevas en conjunto con el uso diario — no asumas
que el alcance está cerrado en lo ya construido.

Próximo paso: Fase 4 (personalización: temas, layout de widgets, reportes),
o seguir acercando Data Center al feature-set de Notion
(`FloatingBlockActions` de `@yoopta/ui` — drag handle + menú "..." por
bloque, mover páginas de padre por drag-and-drop o selector, íconos/emoji
por página, dashboard de Inicio) según lo que el usuario pida a medida que
lo usa.
