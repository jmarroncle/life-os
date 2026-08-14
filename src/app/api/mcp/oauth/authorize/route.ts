import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedRedirectUri } from "@/lib/mcp/oauth-redirect-allowlist";
import { issueAuthorizationCode } from "@/lib/mcp/oauth-tokens";

// Pantalla de consentimiento OAuth. GET la muestra (o manda a /login si no
// hay sesión de Supabase, preservando la URL de vuelta vía ?next=); POST
// procesa el click en "Autorizar"/"Cancelar". No hay noción de "otro
// usuario": el único que puede loguearse acá es el dueño de Life OS, así
// que aprobar el consentimiento es sólo una confirmación visual de que el
// redirect_uri es realmente el del cliente esperado (ver
// oauth-redirect-allowlist.ts para por qué esto importa).

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlPage(body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:28rem;margin:4rem auto;padding:0 1rem;color:#171717">${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function errorPage(message: string) {
  return htmlPage(`<h1 style="font-size:1.25rem">Error</h1><p>${escapeHtml(message)}</p>`, 400);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const responseType = url.searchParams.get("response_type");
  const redirectUri = url.searchParams.get("redirect_uri");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const state = url.searchParams.get("state") ?? "";

  if (
    responseType !== "code" ||
    !redirectUri ||
    !codeChallenge ||
    codeChallengeMethod !== "S256"
  ) {
    return errorPage("Solicitud OAuth inválida o incompleta.");
  }
  if (!isAllowedRedirectUri(redirectUri)) {
    return errorPage("El redirect_uri de este cliente no está permitido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/api/mcp/oauth/authorize?${url.searchParams.toString()}`;
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(next)}`, url.origin),
    );
  }

  const redirectHost = new URL(redirectUri).host;

  return htmlPage(`
    <h1 style="font-size:1.25rem">Conectar Life OS</h1>
    <p><strong>${escapeHtml(redirectHost)}</strong> quiere acceder a tus tareas, páginas, notas y finanzas en Life OS.</p>
    <form method="POST" style="display:flex;gap:.5rem;margin-top:1.5rem">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}" />
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <button type="submit" name="decision" value="allow" style="flex:1;padding:.5rem;background:#171717;color:#fff;border:none;border-radius:.375rem;cursor:pointer">Autorizar</button>
      <button type="submit" name="decision" value="deny" style="flex:1;padding:.5rem;background:#f5f5f5;border:1px solid #d4d4d4;border-radius:.375rem;cursor:pointer">Cancelar</button>
    </form>
  `);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const decision = form.get("decision");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const codeChallenge = String(form.get("code_challenge") ?? "");
  const state = String(form.get("state") ?? "");

  if (!isAllowedRedirectUri(redirectUri)) {
    return errorPage("El redirect_uri de este cliente no está permitido.");
  }

  const target = new URL(redirectUri);

  // 303, no el 307 default de NextResponse.redirect: un redirect OAuth
  // siempre tiene que llegar como GET al redirect_uri del cliente, pero
  // esto responde a un POST (el submit del form de consentimiento) — con
  // 307 el browser reintenta el redirect preservando el método y termina
  // haciendo POST al callback de claude.ai, que sólo acepta GET (así se
  // manifestó como "Method Not Allowed" del lado de claude.ai).
  if (decision !== "allow") {
    target.searchParams.set("error", "access_denied");
    if (state) target.searchParams.set("state", state);
    return NextResponse.redirect(target, 303);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorPage("Tu sesión expiró, volvé a intentar la conexión.");
  }

  const code = issueAuthorizationCode({
    userId: user.id,
    redirectUri,
    codeChallenge,
  });
  target.searchParams.set("code", code);
  if (state) target.searchParams.set("state", state);
  return NextResponse.redirect(target, 303);
}
