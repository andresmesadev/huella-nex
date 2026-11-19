"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@/lib/social-identity";

const providerLogos = {
  google: "/brand/google-sign-in.png",
  "microsoft-entra-id": "/brand/microsoft-sign-in.png",
} satisfies Partial<Record<SocialProvider, string>>;

const providerIds = Object.keys(providerLogos) as (keyof typeof providerLogos)[];

type Availability = { enabled: (keyof typeof providerLogos)[]; failed: boolean };

export function SocialSignInButtons({ mode }: { mode: "register" | "login" }) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [starting, setStarting] = useState<keyof typeof providerLogos | null>(null);
  const [error, setError] = useState(false);
  const action = mode === "register" ? "Crear cuenta con" : "Iniciar sesión con";
  const status = !availability
    ? "Comprobando opciones de acceso…"
    : availability.failed ? "No pudimos comprobar el acceso con estos proveedores. Inténtalo de nuevo más tarde." : "";

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

  async function start(provider: keyof typeof providerLogos) {
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
    <section aria-label={action + " un proveedor"} className="mt-5 space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span>o</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-2">
        {providerIds.map(provider => {
          const enabled = availability?.enabled.includes(provider) ?? false;
          const pending = availability && !availability.failed && !enabled;
          return (
            <Button key={provider} type="button" variant="outline" disabled={!enabled || starting !== null}
              className="h-auto min-h-12 w-full justify-start gap-2.5 border-[#d2dfdc] bg-white px-3 py-2 text-left whitespace-normal text-[#1f1f1f] hover:border-[#a5bcb7] hover:bg-[#f6f9f8] disabled:opacity-100"
              onClick={() => { void start(provider); }}>
              <Image src={providerLogos[provider]} alt="" width={20} height={20} unoptimized className="size-5 shrink-0 object-contain" />
              <span className={enabled ? "flex-1" : "flex-1 text-muted-foreground"}>
                {starting === provider ? "Abriendo" : action} {SOCIAL_PROVIDER_LABELS[provider]}
                {provider === "microsoft-entra-id" && <span className="block text-xs font-normal text-muted-foreground">Outlook y Hotmail</span>}
              </span>
              {pending && <span className="shrink-0 text-xs font-normal text-muted-foreground">Pendiente</span>}
            </Button>
          );
        })}
      </div>
      {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
      {error && <p role="alert" className="text-sm text-destructive">No pudimos abrir el acceso. Inténtalo de nuevo.</p>}
    </section>
  );
}
