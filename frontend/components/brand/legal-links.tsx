import Link from "next/link";

export const LEGAL_LINKS = [
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos", label: "Condiciones" },
  { href: "/eliminacion-de-datos", label: "Eliminación de datos" },
] as const;

/** Enlaces a los documentos legales públicos, para pies de página fuera del dashboard. */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Documentos legales" className={`flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground ${className}`}>
      {LEGAL_LINKS.map(({ href, label }) => (
        <Link key={href} href={href} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground">{label}</Link>
      ))}
    </nav>
  );
}
