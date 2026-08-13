import { pgSchema } from "drizzle-orm/pg-core";

// Life OS comparte el proyecto de Supabase de behavioral-design-platform
// (límite de proyectos free), pero vive en su propio schema de Postgres
// para no pisar sus tablas. `lifeOs.table(...)` define tablas dentro de
// "life_os"; drizzle-kit crea el schema solo cuando corras
// `npm run db:generate` + `npm run db:migrate` la primera vez.
export const lifeOs = pgSchema("life_os");

// Las tablas de tareas, notas, finanzas y foco se suman acá a medida que
// avanzan las fases del roadmap (ver README.md), no todas de una. Ejemplo:
// export const tasks = lifeOs.table("tasks", { ... });
