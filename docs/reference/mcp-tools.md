# Tools del servidor MCP (`/api/mcp`)

Reference de las 26 tools que expone el servidor MCP de Life OS. Para el
setup de conexión (claude.ai, Claude Desktop, Claude Code CLI) y el
razonamiento detrás del diseño (auth stateless, por qué no reusa las server
actions, límites conocidos), ver [MCP en el README](../../README.md#mcp) y
"Notas técnicas".

Fuente de verdad real: `src/lib/mcp/tools/*.ts`. Todas las tools filtran por
el `user_id` que llega en `AuthInfo.extra` (ver
[`src/lib/mcp/auth.ts`](../../src/lib/mcp/auth.ts)) — no hay forma de leer
o escribir datos de otro usuario aunque el token fuera válido para otra
cuenta, porque no existe tal escenario (Life OS es de un solo usuario).

**Leyenda de columnas**: *RO* = `readOnlyHint` (no escribe nada) · *Destr.* =
`destructiveHint` (borra algo de forma permanente, sin confirmación
adicional del lado del MCP).

## Tareas y proyectos (`tasks.ts`, 5 tools)

| Tool | Qué hace | Parámetros | RO | Destr. |
|---|---|---|---|---|
| `life_os_list_tasks` | Lista tareas de Data Center, opcionalmente filtradas por estado | `status?`: `todo` \| `doing` \| `done` | ✅ | |
| `life_os_create_task` | Crea una tarea nueva | `title` (req.) · `description?` · `projectId?` (uuid) · `dueDate?` (ISO 8601) | | |
| `life_os_update_task` | Actualiza campos de una tarea existente — solo cambia lo que se pasa | `id` (req., uuid) · `title?` · `description?` · `status?` · `projectId?` (uuid \| null) · `dueDate?` (ISO 8601 \| null) | | |
| `life_os_delete_task` | Elimina una tarea de forma permanente | `id` (req., uuid) | | ⚠️ |
| `life_os_list_projects` | Lista los proyectos (para agrupar tareas y para "Crear PR") | — | ✅ | |

## Páginas (`pages.ts`, 5 tools)

Contenido siempre como **texto plano** (párrafos separados por línea en
blanco) — el editor de bloques con formato rico (títulos, listas, tablas)
solo funciona desde la app web. Toda página creada o editada por acá entra
con `review_status: "draft"`.

| Tool | Qué hace | Parámetros | RO | Destr. |
|---|---|---|---|---|
| `life_os_list_pages` | Lista páginas con su jerarquía (`parentId`) | — | ✅ | |
| `life_os_get_page` | Devuelve título + contenido en texto plano de una página | `id` (req., uuid) | ✅ | |
| `life_os_create_page` | Crea una página nueva, opcionalmente como subpágina | `title` (req.) · `content?` · `parentId?` (uuid) · `icon?` (emoji) | | |
| `life_os_update_page` | Actualiza título y/o reemplaza todo el contenido | `id` (req., uuid) · `title?` · `content?` | | |
| `life_os_delete_page` | Elimina la página **y sus subpáginas** (cascada) | `id` (req., uuid) | | ⚠️ |

## Notas (`notes.ts`, 4 tools)

Toda nota creada por acá recibe automáticamente el tag `"IA"`.

| Tool | Qué hace | Parámetros | RO | Destr. |
|---|---|---|---|---|
| `life_os_list_notes` | Lista notas, opcionalmente filtradas por texto en título o tags | `query?` | ✅ | |
| `life_os_get_note` | Devuelve título, tags y contenido en texto plano | `id` (req., uuid) | ✅ | |
| `life_os_create_note` | Crea una nota nueva | `title` (req.) · `content?` · `tags?` (string[]) | | |
| `life_os_delete_note` | Elimina una nota de forma permanente | `id` (req., uuid) | | ⚠️ |

## Finanzas (`finance.ts`, 5 tools)

| Tool | Qué hace | Parámetros | RO | Destr. |
|---|---|---|---|---|
| `life_os_list_accounts` | Lista las cuentas (banco, efectivo, tarjeta) | — | ✅ | |
| `life_os_list_categories` | Lista las categorías de ingreso/gasto | — | ✅ | |
| `life_os_get_finance_summary` | Ingresos, gastos, balance y desglose por categoría de un mes | `month?` (`YYYY-MM`, default mes actual) | ✅ | |
| `life_os_list_transactions` | Lista los últimos movimientos | `limit?` (1–100, default 20) | ✅ | |
| `life_os_create_transaction` | Registra un movimiento — **monto en pesos, no en centavos**; signo determina ingreso/gasto | `accountId` (req., uuid) · `amount` (req., número — negativo = gasto) · `categoryId?` (uuid) · `description?` · `occurredAt?` (ISO 8601) | | |

## Bases de datos genéricas (`databases.ts`, 7 tools)

El chat no conoce los UUID de columna: recibe y devuelve valores keyeados
por **nombre** de columna (`life_os_get_database` primero para ver los
nombres disponibles), y la traducción a `column_id` interno pasa por acá.
Toda fila creada por MCP recibe el tag `"IA"` en una columna `Tags`
(`multi_select`) que se crea sola si la base todavía no la tiene.

| Tool | Qué hace | Parámetros | RO | Destr. |
|---|---|---|---|---|
| `life_os_list_databases` | Lista las bases de datos | — | ✅ | |
| `life_os_get_database` | Columnas + filas de una base, valores keyeados por nombre de columna | `id` (req., uuid) | ✅ | |
| `life_os_get_database_row` | Valores y contenido de una fila puntual (cada fila es también una página) | `rowId` (req., uuid) | ✅ | |
| `life_os_add_database_row` | Agrega una fila — una columna inexistente en `values` se ignora (se avisa en la respuesta) | `databaseId` (req., uuid) · `values?` (`{ [nombreColumna]: valor }`) · `content?` | | |
| `life_os_update_database_row` | Actualiza valores y/o contenido de una fila — solo cambia lo que se pasa | `rowId` (req., uuid) · `values?` · `content?` | | |
| `life_os_add_database_column` | Agrega una columna nueva a una base existente | `databaseId` (req., uuid) · `name` (req.) · `type?` (`text` \| `number` \| `select` \| `multi_select` \| `date` \| `checkbox` \| `url`, default `text`) · `options?` (string[], solo select/multi_select) | | |
| `life_os_delete_database_row` | Elimina una fila de forma permanente | `rowId` (req., uuid) | | ⚠️ |

## Lo que todavía no cubre

- **Reportes** (`/reportes`) no tiene tool — la agregación depende de
  `requireUser()` (sesión de cookies), que las tools MCP no tienen.
- **Formato rico** en páginas/notas/filas: solo texto plano. El editor de
  bloques (títulos, listas, tablas, imágenes) es exclusivo de la app web.
- Cada llamada queda auditada en `life_os.mcp_calls` — ver
  [database-schema.md](database-schema.md#mcp_calls).
