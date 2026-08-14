// No mantenemos un registro persistente de clients OAuth (ver
// src/app/api/mcp/oauth/register): cualquiera puede "registrarse" y pedir
// cualquier client_id. La barrera real es esta allowlist de hosts de
// redirect_uri — sin ella, alguien podría armar un link de /authorize con
// un redirect_uri propio y, si el usuario logueado lo aprueba pensando que
// es claude.ai, robarse el código. Agregar acá cualquier otro cliente MCP
// legítimo que el usuario quiera conectar.
const ALLOWED_REDIRECT_HOSTS = ["claude.ai", "claude.com", "localhost", "127.0.0.1"];

export function isAllowedRedirectUri(redirectUri: string): boolean {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return false;
  }
  return ALLOWED_REDIRECT_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );
}
