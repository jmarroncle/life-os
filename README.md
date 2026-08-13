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
- **Yoopta-Editor** (evaluado, no instalado todavía) para el editor de
  bloques del Data Center y la Libreta — MIT, construido sobre Slate.js,
  tiene tema para shadcn y exporta a Markdown/HTML.

## Roadmap

- **Fase 0 (hecho)**: scaffold del proyecto, Supabase auth (magic link),
  shell de navegación, manifest PWA básico, config de Drizzle.
- **Fase 1**: Data Center (páginas + tareas) + Libreta + Pomodoro.
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

Necesitás un proyecto de [Supabase](https://supabase.com) (gratis) con:

1. Auth → Providers → Email → habilitar "magic link".
2. Copiar `Project URL` y `anon public key` a `.env.local`.
3. Copiar el connection string del pooler (modo "Transaction") a
   `DATABASE_URL`.

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
