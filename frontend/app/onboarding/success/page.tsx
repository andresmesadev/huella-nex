import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { RegistrationShell } from "@/components/onboarding/registration-shell";
import styles from "@/components/onboarding/registration.module.css";

export default async function OnboardingSuccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.socialIdentity) redirect("/onboarding");
  return <RegistrationShell>
    <div className={styles.successIcon}><Check size={26} aria-hidden="true" /></div>
    <h2 className={styles.title}>Tu cuenta está lista.</h2>
    <p className={styles.description}>{session.user.name}, ya puedes preparar tu negocio para la primera cita o venta.</p>
    <ol className={styles.nextSteps}>
      <li><span>1</span><div><strong>Revisa los datos de tu negocio</strong><p>Confirma la información y las actividades que elegiste.</p></div></li>
      <li><span>2</span><div><strong>Configura tu operación</strong><p>Agrega horarios, servicios o productos según tu actividad.</p></div></li>
      <li><span>3</span><div><strong>Empieza tu primera jornada</strong><p>Abre Caja y registra tu primera atención o venta.</p></div></li>
    </ol>
    <Link href="/dashboard/settings?guide=1" className={styles.primary} style={{ width: "100%" }}>Configurar mi negocio<ArrowRight size={17} aria-hidden="true" /></Link>
  </RegistrationShell>;
}
