"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProductBrand } from "@/components/brand/product-brand";
import { clearWorkspaceSession, workspaceStorage } from "@/lib/workspace-session";
import { clearSaleDrafts } from "@/lib/pos-draft";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { BreadcrumbNav } from "./breadcrumb-nav";
import { DashboardAccessProvider } from "./dashboard-access-provider";
import { OperationHelp } from "./operation-help";
import { DashboardLoading } from "./dashboard-loading";

export function DashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    // Native listeners cover portaled dialogs and keep numeric values stable
    // while scrolling, without blurring the field or changing its validation.
    function preventWheelStep(event: WheelEvent) {
      if (event.target instanceof HTMLInputElement && event.target.type === "number" && document.activeElement === event.target) event.preventDefault();
    }
    function preventArrowStep(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement && event.target.type === "number" && ["ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
    }
    document.addEventListener("wheel", preventWheelStep, { capture: true, passive: false });
    document.addEventListener("keydown", preventArrowStep, true);
    return () => {
      document.removeEventListener("wheel", preventWheelStep, true);
      document.removeEventListener("keydown", preventArrowStep, true);
    };
  }, []);
  if (pathname === "/dashboard/billing") {
    return <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-white px-4 py-4 md:px-8">
        <Link href="/" aria-label="Huella Nex, inicio"><ProductBrand size="md" /></Link>
        <form action="/api/auth/signout" method="get" onSubmit={() => {
          clearWorkspaceSession(workspaceStorage());
          try { clearSaleDrafts(sessionStorage); } catch { /* Storage cannot block explicit sign-out. */ }
        }}><input type="hidden" name="callbackUrl" value="/login" /><button type="submit" className="min-h-11 rounded-lg border px-4 text-sm font-medium">Cerrar sesión</button></form>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>;
  }
  return <DashboardAccessProvider><div className="min-h-screen bg-background text-foreground">
    <DashboardSidebar />
    <div className="lg:pl-64">
      <Suspense fallback={null}><DashboardTopbar /></Suspense>
      <main className="px-4 py-6 md:px-8 md:py-8"><Suspense fallback={<DashboardLoading />}>
        <BreadcrumbNav />{children}<OperationHelp />
      </Suspense></main>
    </div>
  </div></DashboardAccessProvider>;
}
