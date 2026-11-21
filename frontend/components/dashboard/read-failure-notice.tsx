import Link from "next/link";
import { READ_FAILURE_MESSAGE, READ_FAILURE_RETRYABLE, type ReadFailure } from "@/lib/read-failure";

const ACTION_CLASS = "inline-flex min-h-11 items-center rounded-lg border border-amber-300 bg-white px-4 font-semibold transition-colors hover:bg-amber-100";

const FALLBACK_ACTION: Record<Exclude<ReadFailure, "unavailable" | "rejected">, { href: string; label: string }> = {
  session: { href: "/login", label: "Iniciar sesión" },
  suspended: { href: "/dashboard/billing", label: "Ir a Plan y facturación" },
  denied: { href: "/dashboard", label: "Volver al inicio" },
};

/** Aviso de lectura fallida con un motivo claro y la salida que corresponde. */
export function ReadFailureNotice({ title, reason, retryHref, children }: {
  title: string;
  reason: ReadFailure;
  retryHref: string;
  children?: React.ReactNode;
}) {
  const fallback = reason === "unavailable" || reason === "rejected" ? null : FALLBACK_ACTION[reason];
  return (
    <div role="alert" className="max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1">{READ_FAILURE_MESSAGE[reason]}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {READ_FAILURE_RETRYABLE[reason] && <Link href={retryHref} className={ACTION_CLASS}>Reintentar</Link>}
        {fallback && <Link href={fallback.href} className={ACTION_CLASS}>{fallback.label}</Link>}
        {children}
      </div>
    </div>
  );
}
