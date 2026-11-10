import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ChevronDown, CircleDollarSign, HeartPulse, Mail, Package, PawPrint, Scissors, ShoppingBag, UsersRound } from "lucide-react";
import { ProductBrand } from "@/components/brand/product-brand";
import { OperationPreview } from "@/components/marketing/operation-preview";
import { PRODUCT_DESCRIPTION, PRODUCT_SUPPORT_EMAIL } from "@/lib/product-brand";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Huella Nex | Software para veterinarias, peluquerías y pet shops",
  description: PRODUCT_DESCRIPTION,
};

const demoHref = `mailto:${PRODUCT_SUPPORT_EMAIL}?subject=${encodeURIComponent("Quiero conocer Huella Nex para mi negocio")}`;
const modules = [
  { icon: CalendarDays, title: "Agenda y atención", description: "Organiza las citas por servicio y profesional. Sigue cada atención desde la llegada hasta su finalización." },
  { icon: PawPrint, title: "Clientes y mascotas", description: "Encuentra contactos, datos de cada mascota, visitas y preferencias de atención en su ficha." },
  { icon: ShoppingBag, title: "Punto de venta", description: "Cobra servicios y productos en una sola venta. Registra efectivo, transferencia o un pago combinado." },
  { icon: Package, title: "Inventario", description: "Controla existencias, entradas, ventas y consumos para saber qué tienes y qué necesitas reponer." },
  { icon: UsersRound, title: "Equipo y comisiones", description: "Configura el porcentaje de cada profesional y cuáles servicios se reparten o quedan para el negocio." },
  { icon: CircleDollarSign, title: "Caja y reportes", description: "Revisa ingresos, gastos y comisiones. Registra la base de efectivo y guarda el cierre de la jornada." },
];
const sectors = [
  { icon: HeartPulse, name: "Veterinarias", description: "Coordina consultas y servicios sin perder de vista lo que se vende, se utiliza y se cobra.", features: ["Agenda por servicio y profesional", "Clientes, mascotas y atenciones", "Productos y consumos de inventario"], tone: styles.vet },
  { icon: Scissors, name: "Peluquerías caninas y felinas", description: "Desde la llegada hasta la entrega, mantén a tu equipo al tanto de cada mascota.", features: ["Seguimiento de las atenciones", "Tarifas de peluquería y domicilio", "Comisiones por profesional y servicio"], tone: styles.grooming },
  { icon: ShoppingBag, name: "Pet shops", description: "Conoce tus existencias, registra tus ventas y lleva las cuentas de cada jornada.", features: ["Venta de productos en mostrador", "Stock, entradas y reposición", "Pagos combinados y cierre de caja"], tone: styles.retail },
];
const questions = [
  { question: "¿Me sirve si mi negocio solo es una peluquería o un pet shop?", answer: "Sí. Huella Nex permite configurar el negocio según su actividad. Una peluquería puede concentrarse en sus citas, atenciones y comisiones; un pet shop, en ventas e inventario. También puedes combinar actividades en un mismo establecimiento." },
  { question: "¿Necesito conectar WhatsApp o usar inteligencia artificial?", answer: "No. Puedes trabajar con el dashboard y registrar directamente citas, clientes, ventas y pagos. Las integraciones de WhatsApp e IA se revisan por separado, según su disponibilidad y las condiciones de activación." },
  { question: "¿Puedo registrar una parte en efectivo y otra por transferencia?", answer: "Sí. Puedes dividir el pago entre ambos métodos y conservar el desglose en el cobro, para revisar cómo se recibió el dinero." },
  { question: "¿Cómo funcionan las comisiones?", answer: "Puedes configurar el porcentaje del profesional y señalar qué servicios participan en el reparto. El domicilio y los productos se distinguen de los servicios comisionables para calcular la parte correspondiente." },
  { question: "¿Cómo puedo conocer los planes y empezar?", answer: "Estamos preparando una beta cerrada con acompañamiento. Solicita una demostración para revisar tu actividad, las funciones que necesitas y las condiciones de participación. Los precios y el alcance se confirman antes de contratar." },
  { question: "¿El comprobante del punto de venta es una factura electrónica?", answer: "El comprobante registra el cobro de la operación. No sustituye una factura electrónica ni su emisión a través de la DIAN o de un proveedor autorizado." },
];

function Brand() {
  return <Link href="/" className={styles.brand} aria-label="Huella Nex, inicio"><ProductBrand size="md" /></Link>;
}

function DemoLink({ className, children = "Solicitar una demostración" }: { className: string; children?: React.ReactNode }) {
  return <a href={demoHref} className={className}>{children}<ArrowRight size={18} aria-hidden="true" /></a>;
}

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <a href="#contenido" className={styles.skipLink}>Saltar al contenido</a>
      <header className={styles.header}><div className={styles.headerInner}>
        <Brand />
        <nav className={styles.desktopNav} aria-label="Navegación principal"><a href="#plataforma">La plataforma</a><a href="#sectores">Para tu negocio</a><a href="#preguntas">Preguntas</a></nav>
        <div className={styles.headerActions}><Link href="/login" className={styles.loginLink}>Ingresar</Link><DemoLink className={styles.headerCta}>Solicitar demo</DemoLink></div>
      </div></header>
      <main id="contenido">
        <section className={styles.hero} aria-labelledby="hero-title"><div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}><PawPrint size={17} aria-hidden="true" /> Gestión para negocios de mascotas</p>
            <h1 id="hero-title">Tu negocio de mascotas.<br />Todo bajo control.</h1>
            <p className={styles.heroDescription}>La cita que llega, el producto que vendes y las cuentas al cerrar el día. Organiza tu operación con Huella Nex y dedica más atención a quienes te visitan.</p>
            <div className={styles.heroActions}><DemoLink className={styles.primaryButton} /><a href="#plataforma" className={styles.textButton}>Explorar la plataforma <ChevronDown size={17} aria-hidden="true" /></a></div>
            <div className={styles.heroAudiences}><span>Veterinarias</span><span>Peluquerías</span><span>Pet shops</span></div>
          </div>
          <OperationPreview />
        </div></section>
        <div className={styles.introBand}><div className={styles.sectionInner}><PawPrint size={25} aria-hidden="true" /><p>Nació de una necesidad real.<br /><strong>Hoy acompaña la operación diaria de un centro veterinario.</strong></p><a href="#como-funciona">Conoce cómo funciona <ArrowRight size={17} aria-hidden="true" /></a></div></div>
        <section id="plataforma" className={styles.platform} aria-labelledby="platform-title"><div className={styles.sectionInner}>
          <div className={styles.sectionHeading}><h2 id="platform-title">Todo lo que pasa en tu negocio tiene su lugar.</h2><p>De la agenda al cierre de caja, trabaja con la misma información. Menos búsquedas, más claridad para tu equipo.</p></div>
          <div className={styles.moduleGrid}>{modules.map(({ icon: Icon, title, description }) => <article className={styles.module} key={title}><span className={styles.moduleIcon}><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
        </div></section>
        <section id="sectores" className={styles.sectors} aria-labelledby="sectors-title"><div className={styles.sectionInner}>
          <div className={styles.sectionHeading}><h2 id="sectors-title">Un mismo propósito.<br />Tu forma de trabajar.</h2><p>No todos los negocios atienden igual. Configura los servicios, horarios y equipo que necesita el tuyo.</p></div>
          <div className={styles.sectorGrid}>{sectors.map(({ icon: Icon, name, description, features, tone }) => <article className={`${styles.sector} ${tone}`} key={name}><Icon size={33} strokeWidth={1.6} aria-hidden="true" /><h3>{name}</h3><p>{description}</p><ul>{features.map(feature => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}</ul></article>)}</div>
        </div></section>
        <section id="como-funciona" className={styles.how} aria-labelledby="how-title"><div className={styles.sectionInner}>
          <div className={styles.howHeading}><p className={styles.sectionLabel}>Una jornada con Huella Nex</p><h2 id="how-title">Desde el primer saludo<br />hasta el cierre del día.</h2></div>
          <ol className={styles.steps}>
            <li><span className={styles.stepNumber}>1</span><h3>Prepara tu jornada</h3><p>Consulta la agenda, los servicios y quién los atenderá. En mostrador, encuentra el producto que vas a vender.</p></li>
            <li><span className={styles.stepNumber}>2</span><h3>Registra lo que sucede</h3><p>Actualiza la atención, agrega productos y registra los consumos que correspondan.</p></li>
            <li><span className={styles.stepNumber}>3</span><h3>Cobra con claridad</h3><p>Revisa servicios y adicionales. Confirma cuánto se pagó y cómo recibiste el dinero.</p></li>
            <li><span className={styles.stepNumber}>4</span><h3>Cierra las cuentas</h3><p>Consulta ingresos, gastos y comisiones. Guarda el cierre y el efectivo que dejas como base.</p></li>
          </ol>
        </div></section>
        <section id="preguntas" className={styles.faq} aria-labelledby="faq-title"><div className={styles.faqInner}>
          <div><p className={styles.sectionLabel}>Antes de empezar</p><h2 id="faq-title">Resolvamos tus dudas.</h2><p className={styles.faqIntro}>Cuéntanos cómo trabajas. La demostración es el espacio para revisar si Huella Nex encaja con tu negocio.</p><a href={demoHref} className={styles.emailLink}><Mail size={18} aria-hidden="true" /> Hablar con el equipo</a></div>
          <div className={styles.questions}>{questions.map(({ question, answer }) => <details className={styles.question} key={question}><summary>{question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
        </div></section>
        <section className={styles.finalCta} aria-labelledby="contact-title"><div className={styles.finalInner}>
          <div><span className={styles.betaLabel}>Beta cerrada con acompañamiento</span><h2 id="contact-title">Conozcamos tu negocio.<br />Te mostramos Huella Nex.</h2><p>Revisamos juntos tus servicios, tu equipo y lo que necesitas para empezar.</p></div>
          <div className={styles.finalActions}><DemoLink className={styles.lightButton} /><small>Se abrirá tu aplicación de correo.</small></div>
        </div></section>
      </main>
      <footer className={styles.footer}><div className={styles.footerInner}><div><Brand /><p>Gestión para quienes cuidan mascotas.</p></div><nav aria-label="Enlaces del pie de página"><a href="#plataforma">La plataforma</a><a href="#sectores">Para tu negocio</a><Link href="/login">Ingresar al dashboard</Link><a href={`mailto:${PRODUCT_SUPPORT_EMAIL}`}>Contacto</a></nav><small>© {new Date().getFullYear()} Huella Nex</small></div></footer>
    </div>
  );
}
