"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastVariant = "default" | "error" | "success";

type Toast = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "border-border bg-background text-foreground",
  error: "border-red-300 bg-danger-surface text-red-900",
  success: "border-green-300 bg-success-surface text-green-900",
};

const VARIANT_ICON: Record<ToastVariant, typeof Info> = {
  default: Info,
  error: AlertTriangle,
  success: CheckCircle2,
};

const VARIANT_PREFIX: Record<ToastVariant, string> = {
  default: "Aviso: ",
  error: "Error: ",
  success: "Listo: ",
};

// Los avisos informativos y de éxito se cierran solos; los errores permanecen
// hasta que la persona los cierra, para que haya tiempo de leerlos (WCAG 2.2.1).
const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE = 4;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(AUTO_DISMISS_MS);
  const persistent = toast.variant === "error";
  const Icon = VARIANT_ICON[toast.variant];

  useEffect(() => {
    if (persistent || paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [persistent, paused, onDismiss, toast.id]);

  return (
    <div
      role={persistent ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}
      className={`pointer-events-auto flex items-start gap-2 rounded-lg border py-2 pl-4 pr-1 text-sm shadow-lg animate-in slide-in-from-bottom-2 motion-reduce:animate-none ${VARIANT_STYLES[toast.variant]}`}
    >
      <Icon aria-hidden="true" className="mt-2.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 break-words py-2"><span className="sr-only">{VARIANT_PREFIX[toast.variant]}</span>{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Cerrar aviso"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }].slice(-MAX_VISIBLE));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}
