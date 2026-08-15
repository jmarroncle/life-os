import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  // Life OS comparte el proyecto de Supabase con behavioral-design-platform
  // (ver Decisiones en CLAUDE.md), que tiene sus propias tablas en el
  // schema "public" (incluida una "projects" real, con datos, sin relación
  // con la "projects" de Life OS que vive en "life_os"). Sin este filtro,
  // "drizzle-kit push" introspecciona TODA la base — incluido "public" — y
  // al no reconocer esas tablas ajenas propone BORRARLAS por no estar en
  // este schema.ts. Confirmado en vivo: sin este filtro, push pidió
  // confirmación para borrar "projects (1 fila)" de la otra app. No saques
  // este filtro sin entender esa consecuencia.
  schemaFilter: ["life_os"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
