"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "./expense-form";
import { ExpenseHistory } from "./expense-history";
import { type ReportDetail } from "@/lib/pos-reports";
import { ReportDetailContext } from "./report-detail-context";

export function ExpenseWorkspace({ scope, defaultResponsible, reportDetail }: { scope: string | null; defaultResponsible: string; reportDetail?: ReportDetail }) {
  const router = useRouter();
  const [view, setView] = useState<"form" | "history">(reportDetail ? "history" : "form");
  const [dirty, setDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const approved = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const requestLeave = useCallback((action: () => void) => {
    if (dirty) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPendingAction(() => action);
    }
    else action();
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (approved.current) return;
      event.preventDefault(); event.returnValue = "";
    };
    // Capture dashboard links before Next handles the click. New tabs and downloads
    // do not replace this form and are deliberately left to their normal behavior.
    const followLink = (event: MouseEvent) => {
      if (approved.current || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (!["http:", "https:"].includes(destination.protocol)) return;
      const current = new URL(window.location.href);
      if (destination.origin === current.origin && destination.pathname === current.pathname && destination.search === current.search) return;
      event.preventDefault(); event.stopPropagation();
      requestLeave(() => {
        approved.current = true;
        if (destination.origin === current.origin) router.push(destination.pathname + destination.search + destination.hash);
        else window.location.assign(destination.href);
      });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", followLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", followLink, true); };
  }, [dirty, requestLeave, router]);

  function changeView(next: typeof view) {
    if (next === view) return;
    requestLeave(() => { setDirty(false); approved.current = false; setView(next); });
  }

  return <div className="space-y-5">
    {reportDetail && <ReportDetailContext detail={reportDetail} />}
    <nav aria-label="Opciones de gastos" className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:flex [&_button]:min-h-11">
      <Button type="button" variant={view === "form" ? "default" : "outline"} aria-pressed={view === "form"} onClick={() => changeView("form")}><Plus aria-hidden="true" />Registrar gasto</Button>
      <Button type="button" variant={view === "history" ? "default" : "outline"} aria-pressed={view === "history"} onClick={() => changeView("history")}><History aria-hidden="true" />Consultar gastos</Button>
    </nav>
    {view === "form" ? <ExpenseForm scope={scope} defaultResponsible={defaultResponsible} onDirtyChange={setDirty} /> : <ExpenseHistory reportDetail={reportDetail} />}
    <Dialog open={!!pendingAction} onOpenChange={open => { if (!open) setPendingAction(null); }}>
      <DialogContent className="max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto" onCloseAutoFocus={event => { event.preventDefault(); if (!approved.current && returnFocus.current?.isConnected) returnFocus.current.focus(); }}>
        <DialogHeader className="pr-12"><DialogTitle>¿Salir sin guardar el gasto?</DialogTitle><DialogDescription>Hay datos que todavía no has registrado. Puedes seguir completando el gasto o salir y descartar estos cambios.</DialogDescription></DialogHeader>
        <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2 [&_button]:min-h-11 [&_button]:whitespace-normal"><Button type="button" variant="outline" autoFocus onClick={() => setPendingAction(null)}>Seguir editando</Button><Button type="button" variant="destructive" onClick={() => { const action = pendingAction; setPendingAction(null); action?.(); }}>Salir sin guardar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
