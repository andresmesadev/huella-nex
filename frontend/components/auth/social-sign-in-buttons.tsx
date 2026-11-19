"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@/lib/social-identity";

const providerIds: SocialProvider[] = ["google", "microsoft-entra-id"];

type Availability = { enabled: SocialProvider[]; failed: boolean };

export function SocialSignInButtons({ mode }: { mode: "register" | "login" }) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [starting, setStarting] = useState<SocialProvider | null>(null);
  const [error, setError] = useState(false);
  const action = mode === "register" ? "Crear cuenta con" : "Iniciar sesión con";

  useEffect(() => {
    let mounted = true;
    void getProviders().then(providers => {
      if (mounted) {
        setAvailability(providers
          ? { enabled: providerIds.filter(id => Object.hasOwn(providers, id)), failed: false }
          : { enabled: [], failed: true });
      }
    }).catch(() => {
      if (mounted) setAvailability({ enabled: [], failed: true });
    });
    return () => { mounted = false; };
  }, []);

  async function start(provider: SocialProvider) {
    if (!availability?.enabled.includes(provider) || starting) return;
    setStarting(provider);
    setError(false);
    try {
      await signIn(provider, { redirectTo: "/dashboard" });
    } catch {
      setError(true);
      setStarting(null);
    }
  }

  return (
    <section aria-label={mode === "register" ? "Crear cuenta con un proveedor" : "Iniciar sesión con un proveedor"} className="mb-5 space-y-2 border-b pb-5">
      {providerIds.map(provider => {
        const enabled = availability?.enabled.includes(provider) ?? false;
        const pending = availability && !availability.failed && !enabled;
        return (
          <Button key={provider} type="button" variant="outline" disabled={!enabled || starting !== null}
            className="h-auto min-h-11 w-full justify-between whitespace-normal py-2 text-left disabled:opacity-100"
            onClick={() => { void start(provider); }}>
            <span className={!enabled ? "text-muted-foreground" : undefined}>
              {starting === provider ? "Abriendo" : action} {SOCIAL_PROVIDER_LABELS[provider]}
              {provider === "microsoft-entra-id" && <span className="block text-xs text-muted-foreground">Outlook y Hotmail</span>}
            </span>
            {pending && <span className="shrink-0 text-xs font-normal text-muted-foreground">Pendiente</span>}
          </Button>
        );
      })}
      <p role="status" className="text-sm text-muted-foreground">
        {!availability ? "Comprobando opciones de acceso…"
          : availability.failed ? "No pudimos comprobar el acceso con estos proveedores. Puedes continuar con tu correo y contraseña."
          : availability.enabled.length < providerIds.length ? "Las opciones pendientes estarán disponibles cuando se activen. Puedes usar tu correo y contraseña."
          : "También puedes usar tu correo y contraseña."}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">No pudimos abrir el acceso. Inténtalo de nuevo.</p>}
    </section>
  );
}
