"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";

// Público a propósito, igual que la API de activación — lo visita el
// compañero de equipo sin sesión de Life OS.
export async function getTeamMemberByToken(token: string) {
  const [member] = await db
    .select({
      id: teamMembers.id,
      name: teamMembers.name,
      activatedAt: teamMembers.activatedAt,
    })
    .from(teamMembers)
    .where(eq(teamMembers.activationToken, token))
    .limit(1);
  return member ?? null;
}
