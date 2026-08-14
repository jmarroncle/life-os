import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { googleCalendarConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/data-center/calendario?error=1", request.url),
    );
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    // Google solo manda refresh_token la primera vez que autorizás la app.
    // Si ya la habías conectado antes, hay que revocar el acceso en
    // https://myaccount.google.com/permissions y volver a conectar.
    return NextResponse.redirect(
      new URL("/data-center/calendario?error=no-refresh-token", request.url),
    );
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await db
    .insert(googleCalendarConnections)
    .values({
      userId: user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: googleCalendarConnections.userId,
      set: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
    });

  return NextResponse.redirect(new URL("/data-center/calendario", request.url));
}
