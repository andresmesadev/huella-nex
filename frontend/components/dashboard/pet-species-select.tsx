"use client";

import { NATIVE_SELECT_CLASS } from "@/components/ui/native-select";

/**
 * Especies que acepta el backend (`Pet.type`): mismos valores que validan
 * `pets.routes.js`, `clients.routes.js` y la importación de contactos.
 * Ampliar la lista exige primero cambiar el dominio y la validación del servidor.
 */
export const PET_SPECIES = [
  { value: "dog", label: "Perro" },
  { value: "cat", label: "Gato" },
  { value: "other", label: "Otro" },
] as const;

export type PetSpecies = (typeof PET_SPECIES)[number]["value"];

type Props = {
  id: string;
  value: string;
  onChange: (value: PetSpecies) => void;
  disabled?: boolean;
  labelClassName?: string;
};

export function PetSpeciesSelect({ id, value, onChange, disabled = false, labelClassName = "text-sm font-semibold" }: Props) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className={labelClassName}>Especie *</label>
      <select
        id={id}
        value={value}
        required
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as PetSpecies)}
        className={NATIVE_SELECT_CLASS}
      >
        {PET_SPECIES.map((species) => <option key={species.value} value={species.value}>{species.label}</option>)}
      </select>
    </div>
  );
}
