import { apiUrl } from "@/lib/api";
import { auth } from "@/auth";
import { canonicalAdminEmail } from "@/lib/operator-channel/admin-auth";

type Context = { params: Promise<{ path: string[] }> };
const reply = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Only the validated social session can authorize the internal registration endpoint.
async function forward(request: Request, { params }: Context) {
  const { path } = await params;
  const verify = request.method === "GET" && path.length === 2 && path[0] === "verify" && /^[a-z0-9-]{2,63}$/.test(path[1]);
  const register = request.method === "POST" && path.length === 1 && path[0] === "register";
  const social = request.method === "POST" && path.length === 1 && path[0] === "social-register";
  if (!verify && !register && !social) return reply({ error: "Ruta no disponible." }, 404);
  try {
    let body: string | undefined;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let endpoint = "/api/onboarding/" + path.join("/");
    if (register || social) {
      const origin = request.headers.get("origin");
      // Next's internal URL can use localhost behind a reverse proxy. Compare
      // the browser origin to the incoming Host, not that internal URL.
      if (social && (!origin || request.headers.get("sec-fetch-site") === "cross-site")) return reply({ error: "Solicitud no permitida." }, 403);
      if (origin) {
        let source: URL;
        try { source = new URL(origin); } catch { return reply({ error: "Solicitud no permitida." }, 403); }
        if (!["http:", "https:"].includes(source.protocol) || source.host !== request.headers.get("host")) return reply({ error: "Solicitud no permitida." }, 403);
      }
      if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Formato no admitido." }, 415);
      const raw = await request.text();
      if (raw.length > 8192) return reply({ error: "El formulario es demasiado largo." }, 413);
      let input;
      try { input = JSON.parse(raw); } catch { return reply({ error: "Revisa los datos del formulario." }, 400); }
      if (typeof input?.email === "string" && process.env.ADMIN_EMAIL && canonicalAdminEmail(input.email) === canonicalAdminEmail(process.env.ADMIN_EMAIL)) {
        return reply({ error: "No se pudo crear la cuenta con ese correo o identificador. Si ya tienes una cuenta, inicia sesión." }, 409);
      }
      if (social) {
        const identity = (await auth())?.user.socialIdentity;
        if (!identity || identity.expiresAt <= Date.now()) return reply({ error: "Identifícate de nuevo con tu proveedor para continuar." }, 401);
        const secret = process.env.INTERNAL_API_SECRET;
        if (!secret) return reply({ error: "El acceso no está disponible." }, 503);
        endpoint = "/api/internal/social-register";
        headers["X-Internal-Token"] = secret;
        body = JSON.stringify({ identity: { provider: identity.provider, issuer: identity.issuer, subject: identity.subject }, registration: input });
      } else {
        body = raw;
      }
    }
    const response = await fetch(apiUrl(endpoint), {
      method: request.method, body, cache: "no-store", redirect: "error",
      headers, signal: AbortSignal.timeout(20000),
    });
    const data = await response.json().catch(() => ({ error: response.status === 429 ? "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." : "El servicio no está disponible. Vuelve a intentarlo." }));
    return reply(data, response.status);
  } catch {
    return reply({ error: "No pudimos confirmar la operación. Si estabas creando tu cuenta, intenta iniciar sesión antes de repetir el registro." }, 503);
  }
}

export const GET = forward;
export const POST = forward;
