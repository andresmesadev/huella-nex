import Link from "next/link";
import { CalendarDays, PawPrint, UsersRound, ArrowLeft, Check } from "lucide-react";
import styles from "./registration.module.css";
import { ProductBrand } from "@/components/brand/product-brand";

export function RegistrationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Huella Nex, inicio">
          <ProductBrand size="lg" />
        </Link>
        <p>¿Ya tienes una cuenta? <Link href="/login">Ingresar</Link></p>
      </header>
      <main className={styles.layout}>
        <aside className={styles.intro} aria-label="Empieza con Huella Nex">
          <Link href="/" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" /> Volver al inicio</Link>
          <h1>Tu negocio en Huella Nex</h1>
          <p className={styles.introText}>Organiza clientes, mascotas y cobros en un solo lugar.</p>
          <div className={styles.benefits}>
            <div><CalendarDays size={21} aria-hidden="true" /><p><strong>Tu agenda, en orden</strong><span>Empieza con tus servicios y primeras citas.</span></p></div>
            <div><PawPrint size={21} aria-hidden="true" /><p><strong>Clientes y mascotas</strong><span>Consulta los datos y el historial de cada visita.</span></p></div>
            <div><UsersRound size={21} aria-hidden="true" /><p><strong>Un espacio para tu equipo</strong><span>Invita a cada persona con el acceso que necesita.</span></p></div>
          </div>
          <div className={styles.introNote}><Check size={18} aria-hidden="true" /><p>Puedes empezar a usar el sistema sin conectar WhatsApp.</p></div>
        </aside>
        <section className={styles.workspace} aria-label="Registro de cuenta">{children}</section>
      </main>
      <footer className={styles.footer}>Huella Nex · Para quienes cuidan mascotas.</footer>
    </div>
  );
}
