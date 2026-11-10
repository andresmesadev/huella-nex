"use client";

import { useState } from "react";
import { CalendarDays, Check, HeartPulse, Package, Scissors, ShoppingBag } from "lucide-react";
import { ProductBrand } from "@/components/brand/product-brand";
import styles from "@/app/landing.module.css";

const examples = {
  grooming: { label: "Peluquería", heading: "Cada mascota, en su momento.", icon: Scissors, section: "Atenciones de hoy", rows: [
    { time: "09:00", name: "Baño y peluquería", detail: "Luna · En atención", state: "En atención" },
    { time: "10:20", name: "Baño y peluquería", detail: "Max · Próxima atención", state: "Llegó" },
    { time: "11:00", name: "Corte de uñas", detail: "Milo · Cita confirmada", state: "Confirmada" },
  ], note: "Servicio y domicilio por separado", noteDescription: "Revisa cada valor antes de cobrar.", footer: "Comisiones según tu equipo y tus servicios" },
  veterinary: { label: "Veterinaria", heading: "Una jornada mejor organizada.", icon: HeartPulse, section: "Agenda de consultas", rows: [
    { time: "09:00", name: "Consulta veterinaria", detail: "Luna · En atención", state: "En atención" },
    { time: "09:40", name: "Vacunación", detail: "Max · Próxima atención", state: "Llegó" },
    { time: "10:20", name: "Control veterinario", detail: "Milo · Cita confirmada", state: "Confirmada" },
  ], note: "Atención, productos y cobro", noteDescription: "Agrega a la venta lo que se utilizó.", footer: "Agenda y punto de venta en el mismo lugar" },
  retail: { label: "Pet shop", heading: "Tus ventas y tu stock, a mano.", icon: ShoppingBag, section: "Productos de mostrador", rows: [
    { time: "01", name: "Alimento para gato", detail: "Producto de inventario", state: "Disponible" },
    { time: "02", name: "Correa de paseo", detail: "Producto de inventario", state: "Disponible" },
    { time: "03", name: "Snack para perro", detail: "Producto de inventario", state: "Disponible" },
  ], note: "Un cobro, varias formas de pago", noteDescription: "Efectivo y transferencia en la misma venta.", footer: "Existencias conectadas con el punto de venta" },
};

export function OperationPreview() {
  const [selected, setSelected] = useState<keyof typeof examples>("grooming");
  const example = examples[selected];
  const Icon = example.icon;
  return <div className={styles.previewWrap}>
    <div className={styles.previewTabs} role="group" aria-label="Explorar ejemplos por tipo de negocio">{(Object.keys(examples) as (keyof typeof examples)[]).map(key => <button type="button" key={key} aria-pressed={selected === key} onClick={() => setSelected(key)}>{examples[key].label}</button>)}</div>
    <div className={styles.preview}>
      <div className={styles.previewTop}><ProductBrand size="sm" /><span className={styles.exampleLabel}>Ejemplo ilustrativo</span></div>
      <div className={styles.previewBody}>
        <div className={styles.previewIntro}><span>Tu espacio de trabajo</span><strong>{example.heading}</strong></div>
        <div className={styles.previewPanel}>
          <div className={styles.panelTitle}>{selected === "retail" ? <Package size={17} aria-hidden="true" /> : <CalendarDays size={17} aria-hidden="true" />}<span>{example.section}</span><small>{example.rows.length} {selected === "retail" ? "productos" : "citas"}</small></div>
          <div aria-live="polite" aria-atomic="true">{example.rows.map((row, i) => <div className={styles.appointment} key={`${selected}-${row.name}-${i}`}><span className={styles.time}>{row.time}</span><span className={styles.appointmentIcon}><Icon size={18} aria-hidden="true" /></span><span className={styles.appointmentText}><strong>{row.name}</strong><small>{row.detail}</small></span><span className={`${styles.previewStatus} ${i === 0 && selected !== "retail" ? styles.attending : ""}`}>{row.state}</span></div>)}</div>
        </div>
        <div className={styles.previewNote}><span><Check size={18} aria-hidden="true" /></span><div><strong>{example.note}</strong><p>{example.noteDescription}</p></div></div>
      </div>
      <div className={styles.previewFoot}><span className={styles.statusDot} />{example.footer}</div>
    </div>
    <p className={styles.previewCaption}>Explora un ejemplo de cada actividad.</p>
  </div>;
}
