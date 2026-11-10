"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useDashboardAccess } from "./dashboard-access-provider";
import { Calendar, MessageCircle } from "lucide-react";
import { useTenant } from "@/lib/use-tenant";
import { homeHref } from "@/lib/home-workspace";
import { DashboardSearch } from "./dashboard-search";

function todayLabel(): string {
  const s = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DashboardTopbar() {
  const { data: session } = useSession();
  const access = useDashboardAccess();
  const pathname = usePathname();
  const tenant = useTenant();
  const isHome = pathname === "/dashboard";
  const isVet = access?.role === "vet";

  const rawName = session?.user?.name ?? "";
  const firstName = rawName.split(" ")[0] || "de nuevo";

  return (
    <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-border bg-card px-4 py-4 md:px-8 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-h-11 min-w-0 flex-col justify-center pl-14 lg:pl-0">
        {isVet && pathname === "/dashboard/consultas" ? (
          <><h1 className="text-xl font-bold tracking-tight">Consultas veterinarias</h1><p className="text-sm text-muted-foreground">Tu espacio clínico de trabajo</p></>
        ) : isHome ? (
          <>
            <h1 className="text-xl font-bold tracking-tight md:text-[1.65rem]">
              Hola, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {access?.capabilities.administration ? "Este es el estado de tu negocio hoy." : "Estas son las tareas de tu jornada."}
            </p>
          </>
        ) : (
          <p className="text-sm font-semibold text-foreground/70">
            Panel operativo
          </p>
        )}
      </div>

      {/* Acciones */}
      {access?.capabilities.contacts && <div role="group" aria-label="Accesos rápidos" className="flex shrink-0 items-center gap-3">
        <DashboardSearch key={`${session?.user?.email}:${session?.user?.sessionVersion}:${tenant ?? "current"}`} tenant={tenant} />

        <Link
          prefetch={false}
          href={homeHref("/dashboard/conversations", tenant)}
          title="Conversaciones de WhatsApp"
          aria-label="Conversaciones de WhatsApp"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-primary transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <MessageCircle aria-hidden="true" className="h-5 w-5" />
        </Link>

        <Link
          prefetch={false}
          href={homeHref(access?.capabilities.agenda ? "/dashboard/calendar" : "/dashboard", tenant)}
          title="Agenda"
          aria-label={access?.capabilities.agenda ? `Abrir agenda, ${todayLabel()}` : "Volver al inicio"}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Calendar aria-hidden="true" className="h-4 w-4" />
          <span className="hidden font-medium md:inline">{todayLabel()}</span>
        </Link>
      </div>}
    </header>
  );
}
