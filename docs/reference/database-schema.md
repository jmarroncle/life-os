# Schema de base de datos

Reference de las 17 tablas de Life OS. Fuente de verdad real: [`src/db/schema.ts`](../../src/db/schema.ts)
— este doc es una lectura más cómoda de lo mismo, no un doc paralelo (si
cambia el schema, actualizar acá).

Todas las tablas viven en el schema de Postgres `life_os` (no `public`), y
casi todas tienen `user_id uuid` con foreign key a `auth.users` (`on delete
cascade`) — Life OS es de un solo usuario pero cada fila igual queda
filtrada por dueño, tanto en las server actions como en las tools MCP. Los
tipos son los de Drizzle; en Postgres, `uuid`/`text`/`integer`/`boolean`/
`jsonb`/`timestamptz` mapean uno a uno.

## Data Center

### `projects`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `name` | text, not null | |
| `github_repo` | text | formato `"owner/repo"`, usado por "Crear PR" |
| `created_at` | timestamptz | default now |

### `tasks`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `project_id` | uuid, FK → `projects.id` | `on delete set null` |
| `title` | text, not null | |
| `description` | text | |
| `status` | enum `task_status` | `todo` \| `doing` \| `done`, default `todo` |
| `priority` | enum `task_priority` | `low` \| `medium` \| `high` |
| `assignees` | text | texto libre, **no** es FK a usuarios — viene de tareas importadas de un workspace de equipo en Notion |
| `due_date` | timestamptz | |
| `position` | integer, not null | default 0, para el orden manual |
| `pr_url` | text | seteado por "Crear PR" |
| `created_at` / `updated_at` | timestamptz | |

### `pages`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `parent_id` | uuid, FK → `pages.id` (self) | cascade — null = página raíz; una "carpeta" es solo una página con hijas |
| `title` | text, not null | default `"Sin título"` |
| `icon` | text | emoji suelto, null = sin ícono |
| `layout` | enum `page_layout` | `normal` \| `columns-2` \| `columns-3` |
| `content` | jsonb, not null | bloques de Yoopta, default `{}` |
| `review_status` | enum `content_review_status` | `draft` \| `reviewed` — `draft` cuando la crea/edita el MCP |
| `created_at` / `updated_at` | timestamptz | |

### `notes`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `title` | text, not null | default `"Sin título"` |
| `content` | jsonb, not null | bloques de Yoopta, default `{}` |
| `tags` | text[], not null | default `[]` |
| `created_at` / `updated_at` | timestamptz | |

## Finanzas

Montos siempre en **centavos** (integer con signo: positivo = ingreso,
negativo = gasto) para no arrastrar errores de punto flotante. Una sola
moneda por ahora — `currency` es solo para mostrar, no hay conversión.

### `accounts`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `name` | text, not null | |
| `type` | enum `account_type` | `cash` \| `bank` \| `card` \| `other`, default `bank` |
| `currency` | text, not null | default `"ARS"` |
| `created_at` | timestamptz | |

### `categories`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `name` | text, not null | |
| `kind` | enum `category_kind` | `income` \| `expense`, default `expense` |
| `created_at` | timestamptz | |

### `transactions`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `account_id` | uuid, FK → `accounts.id`, not null | cascade |
| `category_id` | uuid, FK → `categories.id` | `on delete set null` |
| `amount_cents` | integer, not null | signo determina ingreso/gasto |
| `description` | text | |
| `occurred_at` | timestamptz, not null | default now — fecha del movimiento |
| `created_at` | timestamptz | |

### `budgets`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `category_id` | uuid, FK → `categories.id`, not null | cascade |
| `month` | text, not null | formato `"YYYY-MM"` |
| `limit_cents` | integer, not null | |
| `created_at` | timestamptz | |
| — | unique | `(user_id, category_id, month)` — un budget por categoría por mes |

## Bases de datos genéricas (`/bases`)

Equivalente a las "databases" de Notion: colecciones con columnas tipadas.
Cada fila guarda sus valores en un `jsonb` keyeado por `column_id` (no hay
tabla de celdas separada, porque no hay bloques de texto rico dentro de un
valor de columna — solo escalares o arrays).

### `databases`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `name` | text, not null | |
| `icon` | text | |
| `created_at` | timestamptz | |

### `database_columns`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `database_id` | uuid, FK → `databases.id`, not null | cascade |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `name` | text, not null | |
| `type` | enum `database_column_type` | `text` \| `number` \| `select` \| `multi_select` \| `date` \| `checkbox` \| `url` |
| `options` | text[] | opciones disponibles, solo para `select`/`multi_select` |
| `position` | integer, not null | default 0 |
| `created_at` | timestamptz | |

### `database_rows`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `database_id` | uuid, FK → `databases.id`, not null | cascade |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `values` | jsonb, not null | `{ [columnId]: valor }`, default `{}` |
| `content` | jsonb, not null | bloques de Yoopta — cada fila es también una página completa, default `{}` |
| `review_status` | enum `content_review_status` | mismo criterio que `pages.review_status` |
| `position` | integer, not null | default 0 |
| `created_at` / `updated_at` | timestamptz | |

### `database_views`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `database_id` | uuid, FK → `databases.id`, not null | cascade |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `name` | text, not null | |
| `filters` | jsonb, not null | `[{ columnId, op, value }]`, default `[]` |
| `sort_column_id` | uuid | |
| `sort_direction` | text | |
| `position` | integer, not null | default 0 |
| `created_at` | timestamptz | |

Guarda solo el *preset* con nombre (filtros + orden + columnas ocultas) —
las filas siempre viajan completas al cliente, esto no es una copia
filtrada de los datos.

### `page_database_links`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `page_id` | uuid, FK → `pages.id`, not null | cascade |
| `database_id` | uuid, FK → `databases.id`, not null | cascade |
| `created_at` | timestamptz | |
| — | unique | `(page_id, database_id)` |

Permite que una página "embeba" una base de datos existente sin duplicar
datos (ej. mostrarla como tarjeta clickeable).

## Sistema

### `undo_log`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `description` | text, not null | |
| `inverse_ops` | jsonb, not null | lista de operaciones inversas ya resueltas |
| `undone_at` | timestamptz | null si todavía no se deshizo |
| `created_at` | timestamptz | |

Red de seguridad de un solo paso hacia atrás por click (no hay redo, no es
un historial completo tipo Ctrl+Z).

### `mcp_calls`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | cascade |
| `tool_name` | text, not null | |
| `success` | boolean, not null | |
| `summary` | text | resumen corto, no guarda el payload completo |
| `duration_ms` | integer, not null | |
| `estimated_tokens_in` / `estimated_tokens_out` | integer, not null | heurística ~4 caracteres/token, no el tokenizer real de Claude |
| `created_at` | timestamptz | |

Log de auditoría de cada llamada a una tool MCP — ver
[mcp-tools.md](mcp-tools.md).

### `google_calendar_connections`
| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | uuid, PK, FK → `auth.users` | cascade — una fila por usuario |
| `access_token` | text, not null | |
| `refresh_token` | text, not null | |
| `expires_at` | timestamptz, not null | |
| `created_at` | timestamptz | |
