"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { clearWorkspaceSession, workspaceStorage } from "@/lib/workspace-session";
import { clearSaleDrafts } from "@/lib/pos-draft";
import {
  Home,
  Calendar,
  Wallet,
  Users,
  MessageCircle,
  HeartPulse,
  Settings,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Scissors,
  Package,
  Bot,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { homeForRole, ROLE_NAMES } from "@/lib/dashboard-access";
import { useTenant } from "@/lib/use-tenant";
import { homeHref } from "@/lib/home-workspace";
import { ProductBrand } from "@/components/brand/product-brand";
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// ── Estructura de navegación ──────────────────────────────────

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; alsoActiveOn?: string[] };
type NavSection = { heading?: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    heading: "Trabajo diario",
    items: [
      { href: "/dashboard", label: "Inicio", icon: Home, exact: true },
      { href: "/dashboard/calendar", label: "Agenda", icon: Calendar },
      { href: "/dashboard/contacto", label: "Clientes y mascotas", icon: Users, alsoActiveOn: ["/dashboard/clients", "/dashboard/pets"] },
      { href: "/dashboard/consultas", label: "Consultas veterinarias", icon: Stethoscope },
      { href: "/dashboard/peluqueria", label: "Peluquería", icon: Scissors },
      { href: "/dashboard/conversations", label: "WhatsApp", icon: MessageCircle },
    ],
  },
  {
    heading: "Gestión",
    items: [
      { href: "/dashboard/pos", label: "Punto de venta", icon: Wallet, alsoActiveOn: ["/dashboard/revenue"] },
      { href: "/dashboard/inventory", label: "Inventario", icon: Package },
      { href: "/dashboard/assistants", label: "Asistentes", icon: Bot },
      { href: "/dashboard/recuperacion", label: "Seguimiento de clientes", icon: HeartPulse, alsoActiveOn: ["/dashboard/churn", "/dashboard/opportunities", "/dashboard/reactivation"] },
      { href: "/dashboard/settings", label: "Administración", icon: Settings, alsoActiveOn: ["/dashboard/services", "/dashboard/staff", "/dashboard/billing", "/dashboard/admin"] },
    ],
  },
];

function isActive(item: NavItem, pathname: string) {
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href) || item.alsoActiveOn?.some((path) => pathname.startsWith(path)) || false;
}

// ── Item de navegación ────────────────────────────────────────

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(item, pathname);
  const tenant = useTenant();
  const Icon = item.icon;
  return (
    <Link
      href={homeHref(item.href, tenant)}
      prefetch={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
        active
          ? "bg-sidebar-accent font-semibold text-sidebar-primary"
          : "text-sidebar-foreground/75 hover:bg-muted hover:text-sidebar-foreground"
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active
            ? "text-sidebar-primary"
            : "text-muted-foreground group-hover:text-sidebar-foreground"
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ── Contenido del sidebar ─────────────────────────────────────

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const tenant = useTenant();
  const pathname = usePathname();
  const { data: session } = useSession();
  const access = useDashboardAccess();
  const teamRole = access?.role ?? session?.user?.role ?? "admin";
  const sections = SECTIONS.map(section => ({ ...section,
    items: section.items.filter(item => access?.navigation.includes(item.href)),
  })).filter(section => section.items.length > 0);
  const userName = session?.user?.name ?? session?.user?.email ?? "Usuario";
  const role = session?.user?.isSuperAdmin ? "Super administrador" : ROLE_NAMES[access?.professionalRole ?? teamRole];
  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <div
      className="flex h-full flex-col bg-white text-sidebar-foreground"
    >
      {/* Marca */}
      <Link prefetch={false} href={homeHref(homeForRole(teamRole), tenant)} onClick={onNavigate} className={cn("flex items-center gap-3 border-b border-sidebar-border px-5 py-5 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary", onNavigate && "pr-16")}>
        <ProductBrand size="md" subtitle="Tu espacio de trabajo" />
      </Link>

      {/* Navegación */}
      <nav aria-label="Navegación del dashboard" className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {sections.map((section, i) => (
          <div key={section.heading ?? i} className="space-y-1">
            {section.heading && (
              <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground">
                {section.heading}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      {/* Perfil + logout */}
      <div
        className="flex items-center gap-3 border-t border-sidebar-border bg-muted/40 px-4 py-3"
      >
        <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{userName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{role}</p>
        </div>
        <button
          type="button"
          onClick={() => { clearWorkspaceSession(workspaceStorage()); try { clearSaleDrafts(sessionStorage); } catch { /* Sign-out remains available if storage is blocked. */ } void signOut({ callbackUrl: "/login" }); }}
          aria-label="Cerrar sesión"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Sidebar (desktop fijo + drawer móvil) ─────────────────────

export function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <>
      {/* Botón hamburguesa (móvil) */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogTrigger asChild>
          <button type="button" className="fixed left-4 top-4 z-40 inline-flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label="Abrir menú">
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay className="bg-black/40 backdrop-blur-none lg:hidden" />
          <DialogPrimitive.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 w-[min(20rem,calc(100vw-3rem))] border-r border-sidebar-border bg-sidebar outline-none lg:hidden">
            <DialogTitle className="sr-only">Menú principal</DialogTitle>
            <DialogClose asChild>
              <button type="button" className="absolute right-3 top-4 z-10 inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label="Cerrar menú">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </DialogClose>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block">
        <SidebarContent />
      </aside>

    </>
  );
}
