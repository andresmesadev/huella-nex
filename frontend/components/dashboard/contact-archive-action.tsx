"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useActionConfirmation } from "@/components/dashboard/action-confirmation";
import { proxyUrl } from "@/lib/api";
import { tenantQuery } from "@/lib/use-tenant";

type Confirm = ReturnType<typeof useActionConfirmation>["confirm"];

export function useContactArchive(
  resource: "clients" | "pets",
  tenant: string | null,
  confirm: Confirm,
  onChanged: () => void,
) {
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeArchive(id: string, name: string, archived: boolean) {
    const action = archived ? "Archivar" : "Restaurar";
    const archiveMessage = resource === "clients"
      ? "El cliente y sus mascotas saldrán de las listas activas. Su historial quedará disponible."
      : "La mascota saldrá de las listas activas. Su historial quedará disponible.";
    if (!await confirm({
      title: action + " ficha",
      description: action + " a «" + name + "». " + (archived ? archiveMessage : "La ficha volverá a las listas activas."),
      confirmLabel: action,
    })) return;

    setBusyId(id);
    try {
      const url = proxyUrl("/api/dashboard/" + resource + "/" + encodeURIComponent(id) + "/archive" + tenantQuery(tenant));
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? "No se pudo actualizar la ficha.");
      }
      onChanged();
      toast(archived ? "Ficha archivada." : "Ficha restaurada.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo actualizar la ficha.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return { busyId, changeArchive };
}
