"use client";

import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { proxyUrl } from "@/lib/api";
import { useTenant } from "@/lib/use-tenant";
import { formatPhone } from "@/lib/pets";
import { ProtectedDialog, useDialogEditGuard } from "./protected-dialog";
import { FormDialogContent, FormDialogHeader, FormDialogBody, FormDialogFooter } from "./form-layout";
import { NewOwnerPetsSheet } from "@/components/dashboard/new-owner-pets-sheet";

type Owner = { id: string; name: string | null; phone: string; pets?: { id: string; name: string }[] };

const SELECT_CLASS =
  "flex h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const TEXTAREA_CLASS =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

type Step = "search" | "found" | "not-found";

function AddPetContent({ onOpenChange, onCreated, onNewOwner }: Props & { onNewOwner: () => void }) {
  const { toast } = useToast();
  const tenant = useTenant();
  const access = useDashboardAccess();

  const [step, setStep] = useState<Step>("search");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [matches, setMatches] = useState<Owner[]>([]);

  // Pet form state
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("dog");
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [petNotes, setPetNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const dirty = Boolean(petName || petBreed || petGender || petWeight || petNotes || petType !== "dog");
  const discard = useDialogEditGuard(dirty, saving);

  function resetPetForm() {
    setPetName("");
    setPetType("dog");
    setPetBreed("");
    setPetGender("");
    setPetWeight("");
    setPetNotes("");
  }

  function handleClose() {
    setStep("search");
    setPhoneQuery("");
    setOwner(null);
    resetPetForm();
    onOpenChange(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = phoneQuery.trim();
    if (!q) return;

    setSearching(true);
    try {
      const qs = new URLSearchParams({ search: q, limit: "8" });
      if (tenant) qs.set("tenantId", tenant);
      const url = proxyUrl(`/api/dashboard/clients?${qs.toString()}`);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json() as Owner[];
      if (Array.isArray(data) && data.length > 0) {
        setMatches(data);
        setStep("search");
      } else {
        setOwner(null);
        setStep("not-found");
      }
    } catch {
      toast("Error al buscar propietario. Intenta de nuevo.", "error");
    } finally {
      setSearching(false);
    }
  }

  async function handleAddPet(e: React.FormEvent) {
    e.preventDefault();
    if (!owner) return;
    if (!petName.trim()) {
      toast("El nombre de la mascota es requerido.", "error");
      return;
    }

    setSaving(true);
    try {
      const petQs = tenant ? `?tenantId=${encodeURIComponent(tenant)}` : "";
      const res = await fetch(proxyUrl(`/api/dashboard/pets${petQs}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: petName,
          type: petType,
          ownerPhone: owner.phone,
          ownerName: owner.name ?? undefined,
          breed: petBreed || undefined,
          gender: petGender || undefined,
          weight: access?.capabilities.administration && petWeight ? Number(petWeight) : undefined,
          notes: access?.capabilities.administration ? petNotes || undefined : undefined,
          operationalAlerts: access?.capabilities.administration ? undefined : petNotes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "No se pudo crear la mascota");
      }
      toast("Mascota agregada.", "success");
      handleClose();
      onCreated();
      window.dispatchEvent(new CustomEvent("pets:refresh"));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al crear mascota", "error");
    } finally {
      setSaving(false);
    }
  }

  return <FormDialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl gap-0">
    <FormDialogHeader className="py-4 sm:py-5">
      <DialogTitle className="text-lg sm:text-xl">{step === "found" ? "Nueva mascota" : "Agregar mascota"}</DialogTitle>
      <DialogDescription>{step === "found" ? "Confirma el propietario y completa los datos de su mascota." : "Busca y selecciona al propietario antes de agregar su mascota."}</DialogDescription>
    </FormDialogHeader>
    <FormDialogBody className="space-y-4 py-4 [&_input]:min-h-11 [&_button]:min-h-11 [&_button]:whitespace-normal">
      {step !== "found" && <>
        <form onSubmit={handleSearch} className="space-y-3">
          <label htmlFor="apt-phone" className="block text-sm font-semibold">Teléfono o nombre del propietario</label>
          <div className="flex gap-2">
            <Input id="apt-phone" value={phoneQuery} onChange={event => { setPhoneQuery(event.target.value); setMatches([]); setStep("search"); }} placeholder="Ej. 3001234567 o Ana García" autoFocus disabled={searching} />
            <Button type="submit" className="shrink-0" disabled={searching || !phoneQuery.trim()}><Search className="size-4" /><span>{searching ? "Buscando…" : "Buscar"}</span></Button>
          </div>
        </form>
        {matches.length > 0 && <section aria-label="Propietarios encontrados" className="space-y-2">
          <p className="text-sm text-muted-foreground">Selecciona al propietario correcto.</p>
          {matches.map(match => <button type="button" key={match.id} onClick={() => { setOwner(match); resetPetForm(); setStep("found"); }} className="flex min-h-11 w-full flex-col gap-1 rounded-lg border p-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
            <span className="text-sm font-semibold [overflow-wrap:anywhere]">{match.name ?? "Sin nombre"}</span><span className="text-xs text-muted-foreground">{formatPhone(match.phone)}</span>
          </button>)}
          {matches.length === 8 && <p className="text-xs text-muted-foreground">Si no lo ves, busca con el teléfono o un nombre más completo.</p>}
        </section>}
        {step === "not-found" && <p role="status" className="rounded-lg bg-muted p-3 text-sm [overflow-wrap:anywhere]">No encontramos propietarios con «{phoneQuery}». Revisa la búsqueda o registra uno nuevo.</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><p className="text-sm text-muted-foreground">¿Es su primera visita?</p><Button variant="outline" onClick={onNewOwner}>Nuevo propietario y mascotas</Button></div>
      </>}
      {step === "found" && owner && <>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-3">
          <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Propietario seleccionado</p><p className="text-sm font-semibold [overflow-wrap:anywhere]">{owner.name ?? formatPhone(owner.phone)}</p><p className="text-xs text-muted-foreground">{formatPhone(owner.phone)}</p></div>
          <Button variant="outline" disabled={saving} onClick={() => discard(() => { resetPetForm(); setStep("search"); })}><ArrowLeft className="size-4" />Cambiar</Button>
        </div>
        <form id="add-pet-form" onSubmit={handleAddPet} className="space-y-4" aria-busy={saving}>
          <fieldset disabled={saving} className="min-w-0 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5"><label htmlFor="apt-pet-name" className="text-sm font-semibold">Nombre *</label><Input id="apt-pet-name" value={petName} onChange={e => setPetName(e.target.value)} placeholder="Ej. Max" required /></div>
              <div className="min-w-0 space-y-1.5"><label htmlFor="apt-pet-type" className="text-sm font-semibold">Especie *</label><select id="apt-pet-type" value={petType} onChange={e => setPetType(e.target.value)} className={SELECT_CLASS}><option value="dog">Perro</option><option value="cat">Gato</option><option value="other">Otro</option></select></div>
            </div>
            <div className="grid items-end gap-3 sm:grid-cols-3">
              <div className="min-w-0 space-y-1.5"><label htmlFor="apt-pet-breed" className="text-sm font-semibold">Raza (opcional)</label><Input id="apt-pet-breed" value={petBreed} onChange={e => setPetBreed(e.target.value)} placeholder="Sin especificar" /></div>
              <div className="min-w-0 space-y-1.5"><label htmlFor="apt-pet-gender" className="text-sm font-semibold">Sexo (opcional)</label><select id="apt-pet-gender" value={petGender} onChange={e => setPetGender(e.target.value)} className={SELECT_CLASS}><option value="">Sin especificar</option><option value="male">Macho</option><option value="female">Hembra</option></select></div>
              <div className="min-w-0 space-y-1.5"><label htmlFor="apt-pet-weight" className="text-sm font-semibold">Peso (kg) (opcional)</label><Input id="apt-pet-weight" type="number" step="0.1" min="0" disabled={!access?.capabilities.administration || saving} value={petWeight} onChange={e => setPetWeight(e.target.value)} placeholder="Ej. 12.5" /></div>
            </div>
            <div className="space-y-1.5"><label htmlFor="apt-pet-notes" className="text-sm font-semibold">{access?.capabilities.administration ? "Notas y cuidados" : "Alertas para el manejo"} (opcional)</label><textarea id="apt-pet-notes" rows={2} value={petNotes} onChange={e => setPetNotes(e.target.value)} placeholder="Alergias, comportamiento o precauciones" className={TEXTAREA_CLASS} /></div>
          </fieldset>
        </form>
      </>}
    </FormDialogBody>
    <FormDialogFooter className="bg-muted/30 py-3 sm:py-4">
      <Button variant="outline" onClick={() => discard(handleClose)} disabled={saving || searching}>Cancelar</Button>
      {step === "found" && <Button type="submit" form="add-pet-form" disabled={saving}>{saving ? "Guardando…" : "Agregar mascota"}</Button>}
    </FormDialogFooter>
  </FormDialogContent>;
}

export function AddPetToOwnerFlow(props: Props) {
  const [newOwnerOpen, setNewOwnerOpen] = useState(false);
  return <>
    <ProtectedDialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <AddPetContent {...props} onNewOwner={() => { props.onOpenChange(false); setNewOwnerOpen(true); }} />}
    </ProtectedDialog>
    <NewOwnerPetsSheet open={newOwnerOpen} onOpenChange={setNewOwnerOpen} onCreated={() => props.onCreated()} />
  </>;
}
