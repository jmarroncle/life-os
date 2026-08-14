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
- **Modo oscuro: variables CSS globales, no `dark:` por componente**: el
  toggle (`theme-toggle.tsx`) pone `data-theme="dark"` en `<html>` y lo
  persiste en `localStorage` (`life-os:theme`); un script inline al
  principio del `<body>` en `layout.tsx` lo aplica antes del primer paint
  (evita el flash de tema claro). La implementación NO agrega clases
  `dark:` en cada componente — redefine en `globals.css`, bajo
  `[data-theme="dark"]`, las custom properties que Tailwind v4 usa
  internamente para sus utilidades de color (verificado en el CSS
  compilado: `.bg-neutral-50{background-color:var(--color-neutral-50)}`,
  no un valor fijo). Como la escala `neutral-*` se usa en toda la app de
  forma consistente (número más alto = más oscuro en claro), invertirla
  completa resuelve automáticamente cards/bordes/texto/hovers de TODA la
  UI sin tocar un componente. Los acentos (`blue-*`, `green-700`,
  `red-*`) no se invierten — se mapean a variantes con contraste
  adecuado sobre fondo oscuro. **Si agregás un color Tailwind nuevo a
  algún componente, sumale su equivalente oscuro en ese mismo bloque de
  `globals.css` — no escribas `dark:` sueltos, rompe el patrón y hay que
  mantenerlo en dos lugares.** Limitación conocida: el contenido del
  editor de bloques (Yoopta) hereda `color` del DOM así que el texto
  respeta el tema, pero el resaltado de sintaxis de `@yoopta/code`
  (Shiki) no se probó en oscuro — no es parte de esta escala.
- **Editor de bloques**: **Yoopta-Editor** (MIT, sobre Slate.js, exporta a
  Markdown/HTML), instalado en Fase 1. Componente reutilizable en
  `src/components/block-editor.tsx`. Plugins: paragraph, headings, lists,
  blockquote, code, link, divider, marks, **image**, **table**.
  `@yoopta/ui` (barra flotante de marks al seleccionar texto, menú `/`
  para insertar/convertir bloques, y acciones flotantes por bloque al
  pasar el mouse) está integrado: `block-editor-toolbar.tsx`,
  `block-editor-slash-menu.tsx` y `block-editor-block-actions.tsx`,
  renderizados como `children` de `<YooptaEditor>` (así reciben el
  contexto vía `useYooptaEditor()`, igual que hace la librería
  internamente). Son componentes compuestos (Root/Content/Item), no
  drop-in — los ítems del menú `/` llaman `editor.toggleBlock(<TypeKey>, {
  focus: true })` para bloques de texto (con la key PascalCase de cada
  plugin: `Paragraph`, `HeadingOne`, `BulletedList`, etc., no el tipo de
  elemento Slate en minúscula) o los comandos dedicados
  `ImageCommands.insertImage` / `TableCommands.insertTable` para
  imagen/tabla. Las acciones por bloque usan `FloatingBlockActions` (de
  `@yoopta/ui/floating-block-actions`) para el "+" (agregar debajo) y
  `BlockOptions` + `useBlockActions()` (de `@yoopta/ui/block-options`)
  detrás del "⋯" para el menú Duplicar/Eliminar — `useBlockActions` ya
  trae `duplicateBlock`/`deleteBlock`/`copyBlockLink` implementados, no
  hace falta reimplementarlos a mano. El drag-and-drop de bloques usa
  `@yoopta/ui/block-dnd`: `BlockDndContext` envuelve todo `<YooptaEditor>`
  en `block-editor.tsx` (recibe `editor` como prop directo, no por
  contexto), y `renderBlock` en `<YooptaEditor>` envuelve cada bloque en
  `SortableBlock` (con `useDragHandle` para que el arrastre solo dispare
  desde el handle, no clickeando/seleccionando texto en cualquier parte
  del bloque). El "⠿" en `block-editor-block-actions.tsx` es el
  `DragHandle` (`asChild` sobre el mismo `FloatingBlockActions.Button`) —
  reordenar llama `editor.moveBlock` internamente en la librería, no hay
  que wirearlo a mano. Todo esto (toolbar/menú `/`/acciones/dnd) se
  desactiva cuando `readOnly` es `true` (`renderBlock` queda `undefined` y
  no se monta `BlockDndContext`). No se agregó `lucide-react` (no está
  hoisted en node_modules, es una dependencia interna de `@yoopta/ui`) —
  los botones usan texto plano (B/I/U/S, +, ⠿, ⋯) para no sumar una
  dependencia nueva solo por íconos.
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
- **Mover páginas de padre: drag-and-drop nativo, no `@dnd-kit`**:
  `page-tree.tsx` (el árbol de `/data-center`) implementa el reparent con
  la API nativa de HTML5 (`draggable`, `onDragStart/Over/Drop`), no con
  `@dnd-kit` como el drag-and-drop de bloques del editor — acá alcanza con
  eventos nativos porque no hace falta reordenar posiciones ni animar
  overlays, solo reasignar `parentId` al soltar. Soltar una página SOBRE
  otra la convierte en subpágina; una zona punteada aparte ("Soltar acá
  para mover al nivel raíz", solo visible mientras hay un drag en curso)
  la vuelve top-level. `movePage(id, newParentId)` en `data-center/
  actions.ts` valida ciclos (no se puede soltar una página sobre sí misma
  ni sobre una de sus propias subpáginas) recorriendo la cadena de
  ancestros del destino antes de escribir — la UI también bloquea
  visualmente esos drops (calculando los descendientes de la página
  arrastrada) para no depender solo del error del servidor. Limitación
  conocida: drag-and-drop nativo no soporta touch ni teclado — aceptable
  para un árbol de páginas de uso mayormente de escritorio, no le sumes
  `@dnd-kit` acá sin que el usuario lo pida.
- **Íconos de página: emoji en texto plano, sin picker externo**: `pages`
  tiene `icon` (`text`, nullable). `PageIconPicker`
  (`page-icon-picker.tsx`) es un popover casero (sin `asChild`/Radix, sin
  librería de emoji-picker) con una grilla fija de 32 emoji comunes +
  un `<input>` de texto para pegar cualquier otro (el usuario copia desde
  el picker nativo del SO, `Cmd+Ctrl+Space` en Mac). Deliberado: no se
  agregó una dependencia de emoji-picker solo para esto. Sin ícono
  custom se muestra "📄" como fallback (en el árbol, breadcrumb, y lista
  de subpáginas) — no hay forma de "ícono realmente vacío", siempre hay
  algún glifo, igual que Notion. No hay upload de imagen como ícono,
  solo emoji — mantiene la personalización simple; no lo sumes sin que
  el usuario lo pida.
- **Google Calendar: OAuth propio, no el conector de la sesión de agente**:
  `src/lib/google-calendar.ts` implementa el flow de OAuth2 a mano (fetch
  directo a `accounts.google.com` / `oauth2.googleapis.com`), independiente
  de cualquier conector de Google que uses vos como usuario en Claude. Solo
  scope `calendar.readonly`, sin escritura.
- **Dashboard de Inicio: mostrar/ocultar y reordenar, sin drag-and-drop**:
  `dashboard-widgets.tsx` guarda `{ order, hidden }` en `localStorage`
  (`life-os:dashboard-widgets`) y reordena con botones ↑/↓, no arrastre —
  con 6 widgets fijos no vale la pena reimplementar el patrón nativo de
  `page-tree.tsx` para una lista tan corta. `page.tsx` (Server Component)
  sigue trayendo los datos de cada módulo en paralelo; el cliente solo
  decide qué widget mostrar y en qué orden, nunca vuelve a pedir datos.
- **Reportes es un módulo nuevo, no una pestaña de Finanzas**: aunque la
  mayoría de sus datos vienen de `transactions`, también agrega
  `tasks`/`pages`/`notes` (productividad) — por eso es su propia entrada
  de sidebar (`/reportes`) en vez de una tab más dentro de Finanzas. No
  agrega tablas: `reportes/actions.ts` agrupa `transactions` por
  `to_char(occurred_at, 'YYYY-MM')` para la tendencia mensual y cuenta
  filas de `tasks`/`pages`/`notes` para productividad. Rango fijo de 6
  meses (constante `MONTHS_BACK` en `page.tsx`, parámetro `monthsBack` en
  las actions) — no hay selector de rango todavía, sumalo si el usuario
  lo pide.
- **Servidor MCP embebido en la misma app, no un paquete separado**:
  `/api/mcp` (`src/app/api/mcp/route.ts`) usa `mcp-handler`
  (`createMcpHandler` + `withMcpAuth` sobre `@modelcontextprotocol/server`,
  package peer `@modelcontextprotocol/server`, NO `@modelcontextprotocol/sdk`
  — nombres distintos, no los confundas) para exponer las tools sobre
  Streamable HTTP, en vez de un servidor MCP standalone (otro repo, otro
  deploy). Reutiliza el mismo Vercel/Next.js ya andando — coherente con
  cómo se armó todo lo demás (GitHub PAT en vez de GitHub App, Google
  OAuth propio en vez de un servicio aparte: siempre la opción con menos
  piezas móviles para un solo usuario).
  - **Auth: dos caminos, Bearer token fijo Y OAuth 2.1 con PKCE**.
    Se implementó primero sólo el Bearer token fijo (`MCP_ACCESS_TOKEN`,
    comparado en tiempo constante con `crypto.timingSafeEqual`), asumiendo
    que alcanzaba con pegar el header `Authorization` a mano al agregar el
    connector en claude.ai. **Eso era incorrecto**: la UI de "Add custom
    connector" de claude.ai no tiene ningún campo para pegar headers — al
    tocar "Connect" intenta un flujo OAuth 2.1 automático (llega a
    `/authorize` sin que existiera esa ruta → 404). Por eso se agregó un
    mini authorization server propio (`src/app/api/mcp/oauth/*` +
    `src/app/.well-known/oauth-*`, ver el bullet siguiente) que sí resuelve
    ese flujo. El Bearer token fijo **se mantuvo** como segundo camino
    porque sigue siendo más simple para clientes que sí aceptan headers
    manuales (Claude Code CLI vía `--header`, config JSON de Claude
    Desktop) — no hay motivo para forzar el OAuth ahí. `verifyMcpToken`
    (`src/lib/mcp/auth.ts`) prueba primero el token fijo
    (`extra: { userId: MCP_USER_ID }`) y si no matchea, valida si es un
    access token emitido por el authorization server propio (ver abajo).
  - **Mini authorization server OAuth, sin base de datos nueva**: en vez
    de una tabla de clients/codes/tokens, todo es **stateless**:
    authorization codes y access tokens son JSON firmado con
    HMAC-SHA256 (`src/lib/mcp/oauth-tokens.ts`), usando el mismo
    `MCP_ACCESS_TOKEN` como clave de firma (así no hace falta una env var
    más). Piezas:
    - `/.well-known/oauth-authorization-server` (RFC 8414) y
      `/.well-known/oauth-protected-resource` (RFC 9728, generado con
      `protectedResourceHandler` de `mcp-handler`) — metadata que
      `withMcpAuth` referencia vía `resource_metadata` en el header
      `WWW-Authenticate` del 401 (confirmado con `curl -i`: sin auth,
      el 401 apunta a `/.well-known/oauth-protected-resource`).
    - `/api/mcp/oauth/register` (RFC 7591, dynamic client registration):
      **no persiste nada**, devuelve un `client_id` random cualquiera y
      nunca se vuelve a chequear. Esto es aceptable sólo porque la
      seguridad real está en los dos puntos siguientes, no acá.
    - `/api/mcp/oauth/authorize`: GET muestra una pantalla de
      consentimiento HTML simple (o redirige a `/login?next=...` si no
      hay sesión de Supabase — `login/actions.ts` y `login/page.tsx` se
      modificaron para propagar ese `next` a través del magic link vía
      `emailRedirectTo`). POST emite el code (`issueAuthorizationCode`)
      atado al `userId` de la sesión real que aprobó, no a un `MCP_USER_ID`
      fijo. **Sólo acepta `redirect_uri` cuyo host esté en
      `src/lib/mcp/oauth-redirect-allowlist.ts`** (hoy `claude.ai`,
      `claude.com`, `localhost`) — sin esto, como `register` no valida
      nada, cualquiera podría armar un link de authorize con su propio
      redirect y robarse el code si el usuario (verías vos, el único que
      puede loguearse acá) lo aprueba sin fijarse en el dominio mostrado
      en la pantalla de consentimiento.
    - `/api/mcp/oauth/token`: intercambia code por access token,
      validando PKCE S256 (`code_verifier` → SHA-256 → debe matchear el
      `code_challenge` guardado en el code) y que el `redirect_uri`
      coincida con el de `/authorize`. Sin refresh tokens — el access
      token dura 90 días (`ACCESS_TOKEN_TTL_SECONDS`), después hay que
      volver a autorizar.
    - Probado de punta a punta en local con `curl` + un script Node que
      replica `pack()`/PKCE a mano (sin sesión real de Supabase, porque
      el sandbox no tiene browser): metadata, `register` con allowlist,
      redirect a `/login?next=` sin sesión, `token` con PKCE válido e
      inválido, y el access token resultante aceptado por `initialize` en
      `/api/mcp`. **No probado con claude.ai real** (requiere el deploy
      en Vercel + una sesión de browser real) — el usuario tiene que
      probar el connector después del deploy.
  - **Las tools NO reusan `requireUser()` ni las server actions
    existentes** — `requireUser()` depende de la sesión de cookies de
    Supabase (`@/lib/supabase/server`), que no existe en un request
    autenticado por Bearer token. Cada tool en `src/lib/mcp/tools/*.ts`
    tiene su propia query de Drizzle, scopeada por el `userId` que sale
    de `ctx.http.authInfo.extra.userId` (accedido siempre a través del
    wrapper `withUser()` de `src/lib/mcp/tool-helpers.ts`, que también
    centraliza el try/catch → `errorResult`). Esto duplica algo de lógica
    con `actions.ts` de cada módulo — deliberado: evita una
    refactorización grande de código en producción para compartirla. Si
    en algún momento la duplicación se vuelve dolorosa, extraer las
    queries de cada `actions.ts` a funciones puras `(userId, ...) => ...`
    que ambos lados llamen sería el próximo paso, no antes.
  - **`/api/mcp` está en `PUBLIC_PATHS` de `proxy.ts`, a propósito**: sin
    eso, el middleware redirige cualquier request sin cookie de Supabase
    a `/login` antes de que `withMcpAuth` llegue a correr — un cliente
    MCP externo nunca tiene esa cookie. No le saques esa excepción, y si
    agregás una ruta `/api/*` nueva pensá si necesita el mismo trato.
  - **Contenido de página/nota vía MCP = texto plano, sin formato rico**:
    `src/lib/mcp/block-content.ts` arma bloques `Paragraph` a mano
    (`buildSimpleContent`, un bloque por párrafo separado por línea en
    blanco) y los lee de vuelta como texto (`extractPlainText`), porque
    `markdown.deserialize` de `@yoopta/exports` necesita `DOMParser` —no
    corre en una route de Node/serverless— mismo motivo por el que
    `generate-doc-form.tsx` hace esa conversión en el cliente. Títulos,
    listas, etc. no se pueden crear desde el chat todavía.
  - **Sin tools de Reportes por ahora**: `reportes/actions.ts` también
    depende de `requireUser()`, mismo problema que el resto — se puede
    sumar duplicando su agregación como se hizo con Finanzas, pero quedó
    afuera del primer corte por prioridad (tareas era el pedido explícito
    del usuario, "crear procesos").
  - Herramientas actuales (19): `life_os_list_tasks`,
    `life_os_create_task`, `life_os_update_task`, `life_os_delete_task`,
    `life_os_list_projects`, `life_os_list_pages`, `life_os_get_page`,
    `life_os_create_page`, `life_os_update_page`, `life_os_delete_page`,
    `life_os_list_notes`, `life_os_get_note`, `life_os_create_note`,
    `life_os_delete_note`, `life_os_list_accounts`,
    `life_os_list_categories`, `life_os_get_finance_summary`,
    `life_os_list_transactions`, `life_os_create_transaction`.
  - Probado localmente con `npm run dev` + `curl` (handshake `initialize`
    y `tools/list`) contra el proxy y el auth — no se pudo probar
    `tools/call` real de punta a punta desde el sandbox (`DATABASE_URL`
    no está en este entorno), así que probalo vos en Vercel antes de
    asumir que las queries andan.
  - **Sin tools de MCP para el módulo de Bases de datos todavía** (ver
    bullet siguiente) — se puede sumar `life_os_list_databases`,
    `life_os_create_row`, etc. más adelante si hace falta crear/leer filas
    desde el chat.
- **Módulo "Bases de datos" (`/bases`), el equivalente a las databases de
  Notion**: pensado para el caso de importar un workspace de Notion entero
  (páginas → módulo Pages existente, databases → este módulo nuevo).
  Diseño: `databases` (colección) + `database_columns` (nombre, `type` —
  `text`/`number`/`select`/`multi_select`/`date`/`checkbox`/`url` —,
  `options` para select/multi-select) + `database_rows` con un solo
  `values: jsonb` keyeado por `columnId` (NO una tabla de celdas separada:
  no hace falta, los valores son siempre escalares o arrays simples, a
  diferencia de `pages.content`/`notes.content` que sí necesitan bloques de
  texto rico). La tabla en `/bases/[id]` (`src/components/database-table.tsx`)
  usa CSS Grid en vez de un `<table>` real — cada fila es un `<form>` que
  envuelve todas sus celdas como inputs (siempre "en modo edición", sin
  toggle de estado en el cliente) más un botón "✓" (submit normal) y uno
  "×" con `formAction` propio para borrar; eso evita el problema de que
  `<form>` no puede envolver `<tr>` en una tabla HTML real, y evita necesitar
  estado de "cuál fila estoy editando" en el cliente. Al armar los `where()`
  con dos condiciones (id + userId) usar siempre `and(...)` de
  `drizzle-orm` — **nunca `condA && condB`**: los objetos que devuelve
  `eq()` son siempre truthy, así que `&&` devuelve el segundo objeto solo y
  descarta el primero en silencio (bug real que apareció y se corrigió acá:
  un `deleteDatabase(id)` con `eq(id) && eq(userId)` termina borrando
  *todas* las bases del usuario, no solo esa una).

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
  sidebar (Inicio, Data Center, Libreta, Finanzas, Reportes, Foco).
  - `page.tsx` (Inicio) es un dashboard de solo lectura: agrega datos de
    todos los demás módulos en paralelo (`Promise.all`) — tareas
    pendientes (`data-center/tareas/actions`), resumen del mes
    (`finanzas/actions`), páginas y notas recientes
    (`data-center/actions`, `libreta/actions`), y una preview de los
    próximos eventos de Google Calendar con su propio chequeo de conexión
    (mismo patrón que `data-center/calendario/page.tsx`: si no hay fila en
    `google_calendar_connections`, muestra un link para conectar en vez de
    intentar llamar a la API). No tiene lógica propia ni tablas nuevas,
    solo lee y linkea a cada sección — no le agregues acciones de
    escritura acá, van en el módulo correspondiente. El layout de widgets
    (mostrar/ocultar, reordenar) lo maneja `DashboardWidgets`
    (`src/components/dashboard-widgets.tsx`), un Client Component que
    recibe los datos ya resueltos como props — `page.tsx` no sabe nada de
    la preferencia del usuario, ver Decisiones.
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
  - `reportes/page.tsx` + `reportes/actions.ts` (`getMonthlyTrend`,
    `getCategoryTotals`, `getProductivityStats`) — sin layout de tabs, una
    sola página. Ver Decisiones para por qué es su propio módulo y no una
    tab de Finanzas.
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
- `src/app/api/mcp/route.ts` — servidor MCP remoto, en `PUBLIC_PATHS` de
  `proxy.ts` (auth propia por Bearer token u OAuth, no cookies de Supabase
  — ver Decisiones). `src/lib/mcp/auth.ts` (`verifyMcpToken`),
  `src/lib/mcp/tool-helpers.ts` (`withUser`, `jsonResult`, `errorResult`),
  `src/lib/mcp/block-content.ts` (texto plano ↔ bloques Yoopta simples),
  `src/lib/mcp/tools/*.ts` (una tool-registration function por dominio:
  tasks, pages, notes, finance) + `tools/index.ts` (`registerAllTools`).
- `src/app/api/mcp/oauth/{register,authorize,token}/route.ts` +
  `src/app/.well-known/oauth-{authorization-server,protected-resource}/route.ts`
  — mini authorization server OAuth 2.1/PKCE para el connector de
  claude.ai (ver Decisiones). `src/lib/mcp/oauth-tokens.ts` (codes/tokens
  stateless firmados con HMAC), `src/lib/mcp/oauth-redirect-allowlist.ts`
  (hosts de `redirect_uri` permitidos).
- `src/db/` — Drizzle: `schema.ts` (`projects`, `tasks`, `pages` —con
  `parentId` autoreferenciado para jerarquía e `icon` para el emoji—,
  `notes`, `accounts`, `categories`, `transactions`, `budgets`,
  `google_calendar_connections`, todo en el schema `life_os`) y `index.ts`
  (cliente de conexión). Seis migraciones (`0000_` a `0005_`, ver
  `src/db/migrations/`) todavía no se aplicaron en Supabase (ver README →
  Base de datos).
- `src/components/block-editor.tsx` — wrapper de Yoopta: envuelve en
  `BlockDndContext` (drag-and-drop de bloques), usa `renderBlock` para
  envolver cada bloque en `SortableBlock`, y monta
  `block-editor-toolbar.tsx` (barra flotante de marks),
  `block-editor-slash-menu.tsx` (menú `/` de bloques) y
  `block-editor-block-actions.tsx` (acciones "+"/"⠿"/"⋯" al pasar el mouse
  sobre un bloque) como children. `entity-editor.tsx` — título + editor +
  autosave debounced (800ms),
  reutilizado por páginas y notas. `note-editor.tsx` lo extiende con tags.
  `page-tree.tsx` — árbol recursivo de páginas (expandir/colapsar,
  resaltado de página activa, "+" para crear subpágina inline, drag-and-drop
  nativo para reparentar arrastrando una página sobre otra o al nivel
  raíz, ícono/emoji antes del título), usado en `data-center/page.tsx`.
  `page-icon-picker.tsx` — popover casero de emoji, usado en
  `data-center/paginas/[id]/page.tsx`. `task-board.tsx` — tablero de
  tareas con estado
  optimista en cliente + botón "Crear PR" por tarea. `pomodoro-timer.tsx`
  — timer con settings persistidos en localStorage. `focus-ambience.tsx`
  — presets de color + embeds de audio/video personalizables, todo en
  localStorage (ver Decisiones). `generate-doc-form.tsx` — form de
  generación de docs con IA. `theme-toggle.tsx` — toggle de modo
  oscuro/claro, persistido en localStorage (ver Decisiones).
  `dashboard-widgets.tsx` — mostrar/ocultar y reordenar los widgets de
  Inicio, persistido en localStorage (ver Decisiones).

## Patrón de server actions (seguir en todo lo nuevo)

Cada `actions.ts` empieza con `await requireUser()` y todas las queries
filtran por `eq(tabla.userId, user.id)` explícitamente — la conexión de
Drizzle es directa a Postgres (`DATABASE_URL`), NO pasa por PostgREST, así
que RLS no aplica acá. La única barrera de seguridad es este filtro manual.

## Estado actual

Fases 1 a 5 completas. Inicio (dashboard agregando datos de todos los
módulos, con widgets que se pueden mostrar/ocultar y reordenar), Data
Center (páginas con jerarquía tipo Notion —reparentar arrastrando una
página sobre otra, ícono/emoji por página—, tareas, calendario,
generación de docs con IA, PRs), Libreta, Finanzas, **Reportes**
(tendencia mensual, categorías con más gasto, productividad), Foco, y un
**servidor MCP remoto** (`/api/mcp`) para conectar Life OS a un chat. Editor
de bloques con barra flotante, menú `/`, imágenes (Supabase Storage),
tablas, y acciones flotantes por bloque
("+"/arrastrar-reordenar/duplicar/eliminar). Modo oscuro con toggle
explícito.

Build y lint verificados en cada paso. Estado confirmado en runtime real
(no solo build local):
- Las seis migraciones SQL **ya corrieron** en Supabase y `DATABASE_URL`
  quedó bien configurada en Vercel — confirmado revisando
  `get_runtime_errors` del proyecto en Vercel (cero errores después del
  fix; antes fallaba todo con `ECONNREFUSED 127.0.0.1:5432`, señal de que
  `DATABASE_URL` faltaba o estaba mal). Login con magic link funcionando.
- El servidor MCP se probó localmente con `npm run dev` + `curl` (auth
  sin token → 401, con token correcto → `initialize` y `tools/list` OK,
  19 tools registradas) — pero **no** se pudo probar un `tools/call` real
  de punta a punta porque este sandbox no tiene `DATABASE_URL`. Probarlo
  contra el deploy de Vercel antes de asumir que las queries de las tools
  andan.
- El bucket de Storage (`supabase/storage-setup.sql`) y las variables de
  Fase 3 (`ANTHROPIC_API_KEY`/`GITHUB_TOKEN`/`GOOGLE_CLIENT_ID`+
  `GOOGLE_CLIENT_SECRET`) — sin confirmar, puede que sigan pendientes del
  lado del usuario (ver README).
- El modo oscuro (Fase 4) tampoco se pudo ver en un browser real desde
  acá — solo se confirmó que el CSS compila con los valores esperados.

El usuario pidió explícitamente que Life OS sea "casi un clon de Notion":
todas las features clave de Notion tienen que estar presentes, y se van a
seguir sumando features nuevas en conjunto con el uso diario — no asumas
que el alcance está cerrado en lo ya construido.

No queda ningún ítem de roadmap pendiente de las fases originales. Próximo
paso: lo que el usuario pida sobre la marcha a medida que usa la app.
Ideas ya identificadas pero explícitamente NO implementadas (no las
sumes sin que el usuario lo pida): selector de rango de fechas en
Reportes (hoy fijo a 6 meses), acentos de color custom más allá de
claro/oscuro, drag-and-drop de filas/columnas dentro de una tabla del
editor, tools de MCP para Reportes y formato rico (títulos/listas) al
crear páginas/notas desde el chat, flujo OAuth para el MCP en vez de
Bearer token fijo.
