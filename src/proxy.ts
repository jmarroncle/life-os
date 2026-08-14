import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/mcp (y su authorization server en /api/mcp/oauth/*) quedan afuera
// de la sesión de cookies de Supabase a propósito: los llaman clientes
// externos (un chat conectado como MCP remoto) server-to-server, nunca un
// browser logueado acá — su propia autenticación por Bearer token
// (withMcpAuth, ver src/lib/mcp/auth.ts) es la única puerta. La única
// excepción real es /api/mcp/oauth/authorize, que sí se abre en el browser
// del usuario — pero esa ruta hace su propio chequeo de sesión de Supabase
// adentro (necesita mandar a /login con un ?next= si no hay sesión, algo
// que este middleware no puede armar bien). /.well-known/* son los
// endpoints de metadata OAuth (RFC 8414/9728), también llamados
// server-to-server.
const PUBLIC_PATHS = ["/login", "/auth", "/api/mcp", "/.well-known"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
