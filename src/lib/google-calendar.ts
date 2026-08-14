import { eq } from "drizzle-orm";
import { db } from "@/db";
import { googleCalendarConnections } from "@/db/schema";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

function redirectUri() {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/api/google-calendar/callback`;
}

export function buildGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const [connection] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);

  if (!connection) return null;

  if (connection.expiresAt.getTime() > Date.now() + 60_000) {
    return connection.accessToken;
  }

  const refreshed = await refreshAccessToken(connection.refreshToken);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await db
    .update(googleCalendarConnections)
    .set({ accessToken: refreshed.access_token, expiresAt })
    .where(eq(googleCalendarConnections.userId, userId));

  return refreshed.access_token;
}

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string | null;
  htmlLink: string;
};

export async function listUpcomingEvents(
  accessToken: string,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: "10",
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) throw new Error(`Google Calendar API error: ${await res.text()}`);

  const data = await res.json();
  return (data.items ?? []).map((item: Record<string, unknown>) => {
    const start = item.start as Record<string, string> | undefined;
    return {
      id: item.id as string,
      summary: (item.summary as string) ?? "(sin título)",
      start: start?.dateTime ?? start?.date ?? null,
      htmlLink: item.htmlLink as string,
    };
  });
}
