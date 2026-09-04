import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";

// Público a propósito (ver PUBLIC_PATHS en proxy.ts): lo llama el
// navegador del compañero de equipo, que no tiene sesión de Life OS —
// el activationToken en sí es la única autenticación acá, igual que un
// link mágico de un solo uso.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  const subscription = body?.subscription;

  if (!token || !subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const [member] = await db
    .select({ id: teamMembers.id, name: teamMembers.name })
    .from(teamMembers)
    .where(eq(teamMembers.activationToken, token))
    .limit(1);

  if (!member) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }

  await db
    .update(teamMembers)
    .set({ pushSubscription: subscription, activatedAt: new Date() })
    .where(eq(teamMembers.id, member.id));

  return NextResponse.json({ ok: true, name: member.name });
}
