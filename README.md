# Life OS

Plataforma personal de productividad — un "Notion propio" con tareas, notas,
finanzas y foco, pensada para uso diario de un solo usuario. Proyecto
personal / experimento, código abierto.

## Módulos

- **Data Center**: páginas tipo Notion (editor de bloques, con subpáginas
  anidadas — árbol de páginas/carpetas sin límite de profundidad) + tareas
  tipo Asana (proyectos, estados) + calendario de Google + generación de
  docs técnicas con IA + creación de PRs desde una tarea.
- **Libreta**: notas rápidas tipo journal, con tags y buscador. Pensada como
  PWA instalable para captura desde cualquier dispositivo.
- **Finanzas**: cuentas, movimientos, categorías, presupuestos y dashboard
  de gasto.
- **Foco**: timer Pomodoro configurable + fondos ambientales (presets de
  color o tu propio embed de playlist/video), combinables en una "sesión de
  foco".

## Stack

- **Next.js 16** (App Router, Turbopack por defecto) en Vercel.
- **Supabase**: Postgres + Auth (magic link) + Storage.
- **Drizzle ORM** sobre el Postgres de Supabase.
- **Tailwind CSS v4**. shadcn/ui se suma más adelante (ver nota abajo).
- **Yoopta-Editor** para el editor de bloques del Data Center y la Libreta —
  MIT, construido sobre Slate.js, exporta a Markdown/HTML. Soporta atajos
  tipo markdown (`# `, `## `, `- `, etc.) y de teclado (`Cmd+B`, `Cmd+I`, …),
  además de la barra flotante (al seleccionar texto: negrita, itálica,
  subrayado, tachado, código) y el menú `/` (para insertar o convertir el
  bloque actual, incluidas imágenes y tablas) de `@yoopta/ui`. Las imágenes
  se suben a Supabase Storage (ver Storage más abajo).

## Roadmap

- **Fase 0 (hecho)**: scaffold del proyecto, Supabase auth (magic link),
  shell de navegación, manifest PWA básico, config de Drizzle.
- **Fase 1 (hecho)**: Data Center (páginas con editor de bloques + tareas
  tipo Asana con proyectos y estados) + Libreta (notas con tags y buscador)
  + Pomodoro configurable.
- **Fase 2 (hecho)**: Finanzas (cuentas, categorías, movimientos,
  presupuestos mensuales, resumen del mes) + Foco con fondos ambientales y
  playlist/video personalizables.
- **Fase 3 (hecho)**: generación de docs técnicas con IA (Claude API),
  creación de PRs desde una tarea (GitHub), conexión de Google Calendar
  (solo lectura de próximos eventos).
- **Data Center: páginas anidadas (hecho)**: cualquier página puede tener
  subpáginas (una "carpeta" es simplemente una página con hijas, igual que
  en Notion) — árbol expandible/colapsable en `/data-center`, breadcrumb y
  sección de subpáginas dentro de cada página.
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

Las tablas (`life_os.projects`, `tasks`, `pages`, `notes`, `accounts`,
`categories`, `transactions`, `budgets`, `google_calendar_connections`)
todavía no están creadas en Supabase — el schema vive en `src/db/schema.ts`
pero falta aplicarlo. Dos formas de hacerlo:

- **Rápido (una vez):** pegar el contenido de **las cinco** migraciones, en
  orden, en Supabase → SQL Editor → New query, y correrlas (los nombres de
  archivo exactos están en `src/db/migrations/`, empiezan con `0000_`,
  `0001_`, `0002_`, `0003_`, `0004_`). Mismo flujo que ya usás para
  `behavioral-design-platform/supabase/schema.sql`.
- **Con Drizzle (para cambios futuros de schema):** con `DATABASE_URL`
  cargado en `.env.local`, `npm run db:generate` genera la migración y
  `npm run db:migrate` la aplica.

## Storage (imágenes)

Las imágenes que se suben desde el editor de bloques (menú `/` → Imagen)
van a un bucket de Supabase Storage que **no** se crea con Drizzle (Storage
vive en el schema `storage`, gestionado por Supabase, no por nuestras
migraciones de Postgres). Correr una sola vez en Supabase → SQL Editor:

- Pegar y ejecutar el contenido de `supabase/storage-setup.sql`. Crea el
  bucket `life-os-uploads` (público, para poder renderizar `<img src>`
  directo) y dos policies que limitan subir/borrar archivos a la propia
  carpeta del usuario (`<user_id>/archivo.ext`), igual que el filtro manual
  por `user_id` que ya usan las server actions sobre Postgres.

Sin este paso, subir una imagen desde el editor falla (el bucket no existe
o falta la policy de `insert`).

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
- `@yoopta/image` y `@yoopta/table` están integrados. La subida de imágenes
  (`src/lib/uploads.ts`, server action `uploadBlockImage`) va a un bucket de
  Supabase Storage — ver la sección Storage más arriba para el setup
  manual del bucket/policies. El wrapper `handleImageUpload` en
  `yoopta-plugins.ts` existe porque el plugin llama
  `upload(file, onProgress)` del lado del cliente y una función no se puede
  pasar como argumento a una server action (no es serializable); el
  wrapper la descarta antes de invocar la server action con solo el
  archivo. No hay borrado de storage al eliminar un bloque de imagen
  (archivo huérfano queda en el bucket) — aceptable para un uso personal,
  documentado como pendiente si hace falta más adelante.
- El tipo de `Table` (`@yoopta/table`) necesita un cast (`as unknown as
  YooptaPlugin<...>`) en `yoopta-plugins.ts` para entrar en el array de
  plugins — es una limitación de los tipos del paquete (su `children`
  interno referencia sus propias 3 claves de elemento, algo que no colapsa
  bien al tipo genérico que espera `createYooptaEditor`), no afecta el
  comportamiento en runtime.
- `@yoopta/ui` está integrado para `FloatingToolbar` (marks al seleccionar
  texto) y `SlashCommandMenu` (menú `/` para insertar/convertir bloques) —
  ver `block-editor-toolbar.tsx` y `block-editor-slash-menu.tsx`. Son
  componentes compuestos (patrón Root/Content/Item, no un drop-in) que se
  montan como `children` de `<YooptaEditor>`. `FloatingBlockActions`
  (drag handle + menú "..." por bloque) todavía no está integrado.
- Todas las queries a la base pasan por Drizzle con conexión directa a
  Postgres (`DATABASE_URL`), no por la REST API de Supabase — o sea que las
  políticas de RLS (si algún día se agregan) NO protegen estas tablas. Cada
  server action en `actions.ts` filtra a mano por `user_id` del usuario
  autenticado; cualquier query nueva tiene que seguir ese mismo patrón.
- **Finanzas** guarda los montos en centavos (`amount_cents`, integer con
  signo: positivo = ingreso, negativo = gasto) para no arrastrar errores de
  punto flotante. Se asume una sola moneda (ARS por defecto en `accounts`);
  no hay conversión entre monedas.
- **Foco** no trae una playlist de jazz ni un video de yoga precargados a
  propósito — el link de un video o playlist específico no es información
  que se pueda inventar de forma confiable (puede no existir, cambiar o no
  ser el gusto del usuario). En cambio, `FocusAmbience`
  (`src/components/focus-ambience.tsx`) deja pegar cualquier link de
  Spotify o YouTube (audio y/o video, por separado) más presets de color
  con CSS puro que no dependen de ningún link externo. Todo se guarda en
  `localStorage`, no en la base.
- **Generar con IA** usa `claude-opus-5` vía `@anthropic-ai/sdk`, sin
  streaming (la respuesta es corta, 1-2 páginas de Markdown, `max_tokens:
  4096`). El Markdown se convierte a bloques de Yoopta **en el cliente**
  (`markdown.deserialize` de `@yoopta/exports` necesita `DOMParser`, no
  corre en Node) — por eso `generate-doc-form.tsx` arma un editor temporal
  en el browser solo para la conversión, y recién ahí llama a
  `createPageWithContent`.
- **Crear PR** usa un Personal Access Token de GitHub (`GITHUB_TOKEN`), no
  una GitHub App con OAuth. Para una herramienta de un solo usuario, un PAT
  fine-grained (scope Contents + Pull requests, limitado a los repos que
  uses) es mucho más simple que registrar una App — si algún día esto pasa
  a multiusuario, ahí sí conviene migrar a OAuth App. El botón crea una
  rama, comitea un archivo `life-os-tasks/<id>.md` con el título/descripción
  de la tarea (GitHub no deja abrir un PR sin al menos un commit de
  diferencia con la base) y abre el PR como draft — es un punto de partida
  para laburar, no un PR "terminado".
- **Google Calendar** es de solo lectura (scope
  `calendar.readonly`) y usa un flow de OAuth propio (`src/lib/
  google-calendar.ts` + las rutas bajo `src/app/api/google-calendar/`) —
  independiente de cualquier conector de Google que uses vos como usuario
  en otro contexto. Guarda `access_token`/`refresh_token` en la tabla
  `google_calendar_connections` y refresca el token solo cuando está por
  vencer. Google solo manda `refresh_token` la primera vez que autorizás
  la app — si reconectás sin haber revocado el acceso antes en
  myaccount.google.com/permissions, el callback lo detecta y avisa.
