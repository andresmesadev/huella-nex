"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@/lib/social-identity";

const providerIds: SocialProvider[] = ["google", "microsoft-entra-id", "apple"];

export function SocialSignInButtons() {
  const [available, setAvailable] = useState<SocialProvider[]>([]);
  const [starting, setStarting] = useState<SocialProvider | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getProviders().then(providers => {
      if (mounted && providers) setAvailable(providerIds.filter(id => Object.hasOwn(providers, id)));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  async function start(provider: SocialProvider) {
    setStarting(provider);
    setError(false);
    try {
      await signIn(provider, { redirectTo: "/dashboard" });
    } catch {
      setError(true);
      setStarting(null);
    }
  }

  if (!available.length) return null;
  return (
    <section aria-label="Acceso con otra cuenta" className="mb-5 space-y-2 border-b pb-5">
      {available.map(provider => (
        <Button key={provider} type="button" variant="outline" className="min-h-11 w-full" disabled={starting !== null}
          onClick={() => { void start(provider); }}>
          {starting === provider ? "Abriendo" : "Continuar con"} {SOCIAL_PROVIDER_LABELS[provider]}
        </Button>
      ))}
      {error && <p role="alert" className="text-sm text-destructive">No pudimos abrir el acceso. Vuelve a intentarlo.</p>}
    </section>
  );
}
