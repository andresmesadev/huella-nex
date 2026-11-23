import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Estilo común de los <select> nativos: mismo alto (44 px), borde, radio y foco
 * que Input. Texto de 16 px en celular para que iOS no haga zoom al enfocar.
 */
export const NATIVE_SELECT_CLASS =
  "flex h-11 w-full min-w-0 rounded-lg border border-input bg-white px-3 text-base transition-colors sm:text-sm focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="native-select" className={cn(NATIVE_SELECT_CLASS, className)} {...props} />;
}
