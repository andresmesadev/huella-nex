"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { SocialSignInButtons } from "@/components/auth/social-sign-in-buttons";
import { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@/lib/social-identity";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, HeartPulse, Scissors, ShoppingBag, ShieldCheck, LoaderCircle } from "lucide-react";
import { RegistrationShell } from "@/components/onboarding/registration-shell";
import styles from "@/components/onboarding/registration.module.css";
import { PLANS, getPlan, planDetailsHref, type PlanId } from "@/lib/plan-catalog";
import { onboardingProvisioning, onboardingNotice, onboardingSupportHref, type OnboardingProvisioning } from "@/lib/onboarding-result";

const ACTIVITIES = [
  { id: "veterinary", label: "Veterinaria", icon: HeartPulse },
  { id: "grooming", label: "Peluquería", icon: Scissors },
  { id: "retail", label: "Pet shop", icon: ShoppingBag },
];
const STEPS = ["Tu cuenta", "Tu negocio", "Plan", "Revisión"];
const PLAN_DESCRIPTIONS: Record<PlanId, string> = {
  free: "Conoce el sistema y configura tu negocio sin contratar.",
  basic: "Agenda, clientes y caja según las actividades que elegiste.",
  pro: "Funciones operativas del Básico. El cupo de IA está por confirmar.",
  custom: "Adaptamos el sistema a la forma de trabajar de tu negocio.",
};
type FormState = { name: string; slug: string; ownerName: string; email: string; password: string; activeModules: string[] };
type Availability = { slug: string; status: "checking" | "available" | "taken" | "error" };

function toSlug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 63).replace(/-$/, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus, update } = useSession();
  const socialIdentity = session?.user.socialIdentity;
  const [registeredWith, setRegisteredWith] = useState<SocialProvider | null>(null);
  const socialProvider = socialIdentity?.provider ?? registeredWith;
  const [socialEmail, setSocialEmail] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [planId, setPlanId] = useState<PlanId | null>(null);
  const selectedPlan = getPlan(planId);
  const [form, setForm] = useState<FormState>({ name: "", slug: "", ownerName: "", email: "", password: "", activeModules: [] });
  const [customSlug, setCustomSlug] = useState(false);
  const [editSlug, setEditSlug] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [retry, setRetry] = useState(0);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [provisioning, setProvisioning] = useState<OnboardingProvisioning>("unknown");
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const submitting = useRef(false);
  const created = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const focusSlugEditor = useRef(false);
  const validSlug = form.slug.length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug);
  const registrationEmail = socialProvider ? (socialEmail ?? socialIdentity?.emailHint ?? form.email) : form.email;
  const status = availability?.slug === form.slug ? availability.status : "checking";
  const notice = registered ? onboardingNotice(provisioning) : null;
  const validName = form.name.trim().length >= 2;
  const mustEditSlug = validName && (!validSlug || status === "taken" || errorField === "slug");
  const showSlugEditor = mustEditSlug || editSlug;
  const canContinueBusiness = validName && validSlug && status === "available" && form.activeModules.length > 0;

  useEffect(() => { title.current?.focus(); }, [step]);
  useEffect(() => {
    if (!validSlug) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAvailability({ slug: form.slug, status: "checking" });
      try {
        const response = await fetch(`/api/onboarding/verify/${encodeURIComponent(form.slug)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("verification");
        const data = await response.json();
        if (typeof data.available !== "boolean") throw new Error("verification");
        if (!controller.signal.aborted) setAvailability({ slug: form.slug, status: data.available ? "available" : "taken" });
      } catch {
        if (!controller.signal.aborted) setAvailability({ slug: form.slug, status: "error" });
      }
    }, 650);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [form.slug, retry, validSlug]);

  function change(field: keyof FormState, value: string) {
    setError(null); setErrorField(null);
    setForm(current => ({ ...current, [field]: value }));
  }
  function move(next: number) { setError(null); setErrorField(null); setStep(next); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || created.current) return;
    setError(null); setErrorField(null);
    if (step === 1) {
      if (form.ownerName.trim().length < 2) {
        setError("Escribe tu nombre para continuar.");
        setErrorField("ownerName");
        return;
      }
      if (!socialIdentity && form.password !== confirmPassword) {
        setError("Las contraseñas no coinciden. Escríbelas de nuevo.");
        setErrorField("confirmPassword");
        return;
      }
      setStep(2); return;
    }
    if (step === 2) {
      if (!canContinueBusiness) return;
      setStep(3); return;
    }
    if (step === 3) {
      if (selectedPlan) setStep(4);
      return;
    }
    if (!selectedPlan) return;
    submitting.current = true; setBusy(true);
    try {
      const registration = {
        name: form.name.trim(), ownerName: form.ownerName.trim(), slug: form.slug,
        email: registrationEmail.trim().toLowerCase(), activeModules: form.activeModules,
        ...(!socialIdentity ? { password: form.password } : {}),
      };
      const response = await fetch(socialIdentity ? "/api/onboarding/social-register" : "/api/onboarding/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(registration),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.field) { setStep(["name", "slug", "activeModules"].includes(data.field) ? 2 : 1); setErrorField(data.field); }
        throw new Error(data?.error || "No pudimos confirmar el registro. Intenta iniciar sesión antes de repetirlo.");
      }
      // Commit succeeded: any sign-in failure must never repeat registration.
      created.current = true;
      setRegisteredWith(socialIdentity?.provider ?? null);
      if (socialIdentity) setSocialEmail(registration.email);
      setRegistered(true);
      const preparation = onboardingProvisioning(data?.provisioning);
      setProvisioning(preparation);
      const password = form.password;
      setForm(current => ({ ...current, password: "" })); setConfirmPassword("");
      try {
        if (socialIdentity) {
          const updated = await update({});
          if (!updated?.user.staffId || !updated.user.tenantId || updated.user.socialIdentity) throw new Error("signin");
        } else {
          const result = await signIn("credentials", { email: registration.email, password, redirect: false });
          if (!result || result.error || result.ok !== true) throw new Error("signin");
        }
        setSignedIn(true);
        if (preparation === "ready") {
          const planQuery = selectedPlan.id === "free" ? "" : "?plan=" + selectedPlan.id;
          router.replace("/onboarding/success" + planQuery);
          router.refresh();
        }
      } catch {
        setError(socialProvider ? "Tu cuenta ya está creada. Vuelve a ingresar con " + SOCIAL_PROVIDER_LABELS[socialProvider] + "." : "Tu cuenta ya está creada. Inicia sesión con tu correo y contraseña para continuar.");
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No pudimos confirmar el registro. Intenta iniciar sesión antes de repetirlo.");
    } finally { submitting.current = false; setBusy(false); }
  }

  return (
    <RegistrationShell>
      <ol className={styles.progress} aria-label="Pasos para crear tu cuenta">
        {STEPS.map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined}>
          <span className={`${styles.progressNumber} ${step > index + 1 ? styles.complete : ""}`}>{step > index + 1 ? <Check size={13} aria-label="Completado" /> : index + 1}</span>{label}
        </li>)}
      </ol>
      <h2 ref={title} tabIndex={-1} className={styles.title}>
        {step === 1 ? (socialProvider ? "Confirma tus datos de contacto" : "Crea tu cuenta") :
          step === 2 ? "Cuéntanos sobre tu negocio" :
          step === 3 ? "Elige un plan" :
          registered ? "Tu cuenta ya está creada" : "Revisa tu registro"}
      </h2>
      <p className={styles.description}>
        {registered ? "Usa tu cuenta para continuar." :
          step === 1 ? (socialProvider ? "Con estos datos podremos contactarte sobre tu cuenta." : "Elige cómo quieres acceder a tu negocio.") :
          step === 2 ? "Escribe el nombre de tu negocio y elige a qué se dedica." :
          step === 3 ? "Puedes empezar con Evaluación o elegir el plan que te interesa." :
          "Confirma tus datos, las actividades de tu negocio y el plan que elegiste."}
      </p>

      {step === 1 && sessionStatus !== "loading" && !socialIdentity && <SocialSignInButtons mode="register" />}
      {step === 1 && socialIdentity && <p className={styles.notice}>Te identificaste con {SOCIAL_PROVIDER_LABELS[socialIdentity.provider]}. Revisa tus datos para continuar.</p>}
      <form onSubmit={submit} className={styles.form}>
        {step === 2 && <>
          <div className={styles.field}>
            <label htmlFor="business-name">Nombre del negocio</label>
            <input id="business-name" name="organization" autoComplete="organization" placeholder="Ej. Mi negocio de mascotas" value={form.name} minLength={2} maxLength={120} required aria-invalid={errorField === "name"} onChange={event => {
              const name = event.target.value; setError(null); setErrorField(null);
              setForm(current => ({ ...current, name, slug: customSlug ? current.slug : toSlug(name) }));
            }} />
          </div>
          <fieldset className={styles.fieldGroup} aria-describedby="activities-hint">
            <legend className={styles.legend}>¿A qué se dedica tu negocio?</legend>
            <div className={styles.moduleOptions}>{ACTIVITIES.map(({ id, label, icon: Icon }) => <label key={id} className={styles.moduleOption}>
              <input type="checkbox" name="activities" value={id} checked={form.activeModules.includes(id)} onChange={event => {
                setError(null); setErrorField(null); setForm(current => ({ ...current, activeModules: event.target.checked ? [...current.activeModules, id] : current.activeModules.filter(item => item !== id) }));
              }} /><Icon size={23} aria-hidden="true" />{label}
            </label>)}</div>
            <p id="activities-hint" className={styles.hint} style={{ marginTop: 9 }}>Elige al menos una actividad. Puedes seleccionar varias y ajustarlas después en Configuración.</p>
          </fieldset>
          {validName && <div className={styles.customize}>
            {showSlugEditor ? (
              <div className={styles.field}>
                <label htmlFor="business-slug">Identificador del negocio</label>
                <input id="business-slug" name="slug" value={form.slug}
                  ref={input => {
                    if (input && focusSlugEditor.current) {
                      focusSlugEditor.current = false;
                      input.focus();
                    }
                  }} required minLength={2} maxLength={63} pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  autoCapitalize="none" spellCheck={false} aria-describedby="slug-hint slug-status" aria-invalid={status === "taken" || errorField === "slug"}
                  onChange={event => {
                    setEditSlug(true);
                    setCustomSlug(true);
                    change("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }} />
                <p id="slug-hint" className={styles.hint}>Usa al menos dos letras o números. Puedes separarlos con guiones.</p>
              </div>
            ) : (
              <div className={styles.slugPreview}>
                <span>Identificador <strong>{form.slug}</strong></span>
                <button type="button" className={styles.editSlug} aria-label="Editar el identificador del negocio" onClick={() => {
                  focusSlugEditor.current = true;
                  setEditSlug(true);
                }}>Editar</button>
              </div>
            )}
            <div id="slug-status" role="status" className={styles.status}>
              {validSlug && (status === "checking" ? "Comprobando disponibilidad…" : status === "available" ? <span className={styles.available}>Identificador disponible.</span> : status === "taken" ? <span className={styles.error}>Ese identificador está en uso. Cámbialo para continuar.</span> : <span className={styles.error}>No pudimos comprobar la disponibilidad.<button className={styles.retry} type="button" onClick={() => { setAvailability(null); setRetry(value => value + 1); }}>Reintentar</button></span>)}
            </div>
          </div>}
        </>}
        {step === 1 && <>
          <div className={styles.field}><label htmlFor="owner-name">Tu nombre</label><input id="owner-name" name="name" autoComplete="name" placeholder="Nombre y apellido" required minLength={2} maxLength={100} value={form.ownerName} aria-invalid={errorField === "ownerName"} onChange={event => change("ownerName", event.target.value)} /></div>
          <div className={styles.field}><label htmlFor="owner-email">Correo electrónico</label><input id="owner-email" name="email" type="email" autoComplete="username" autoCapitalize="none" placeholder="nombre@tunegocio.com" required maxLength={254} value={registrationEmail} aria-invalid={errorField === "email"} aria-describedby="email-hint" onChange={event => {
            if (socialProvider) { setSocialEmail(event.target.value); setError(null); setErrorField(null); }
            else change("email", event.target.value);
          }} /><p id="email-hint" className={styles.hint}>Usa un correo real al que tengas acceso.</p></div>
          {!socialProvider && <>
          <div className={styles.field}><label htmlFor="owner-password">Contraseña</label><div className={styles.passwordWrap}><input id="owner-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required value={form.password} aria-describedby="password-hint" aria-invalid={errorField === "password"} onChange={event => change("password", event.target.value)} /><button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p id="password-hint" className={styles.hint}>Entre 12 y 128 caracteres. Puedes usar una frase fácil de recordar.</p></div>
          <div className={styles.field}><label htmlFor="confirm-password">Confirma tu contraseña</label><input id="confirm-password" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} aria-invalid={errorField === "confirmPassword"} onChange={event => { setConfirmPassword(event.target.value); setError(null); setErrorField(null); }} /></div>
          </>}
        </>}
        {step === 3 && (
          <fieldset className={styles.fieldGroup} aria-describedby="plan-hint">
            <legend className={styles.legend}>Opciones de plan</legend>
            <div className={styles.planOptions}>
              {PLANS.map(plan => (
                <label key={plan.id} className={styles.planOption}>
                  <input type="radio" name="plan" value={plan.id} checked={planId === plan.id} onChange={() => setPlanId(plan.id)} />
                  <strong>{plan.name}</strong>
                  <span className={styles.planPrice}>{plan.price}{(plan.id === "basic" || plan.id === "pro") && " COP/mes"}</span>
                  <span className={styles.planDescription}>{PLAN_DESCRIPTIONS[plan.id]}</span>
                </label>
              ))}
            </div>
            <p id="plan-hint" className={styles.hint}>Los precios son de referencia. Si eliges un plan de pago, podrás revisar el importe y confirmar la contratación en Facturación.</p>
          </fieldset>
        )}
        {step === 4 && selectedPlan && <>
          <dl className={styles.review}>
            <div><dt>Tu cuenta</dt><dd>{form.ownerName}<span>{registrationEmail.trim().toLowerCase()}</span></dd></div>
            <div><dt>Negocio</dt><dd>{form.name}<span>{form.slug}</span></dd></div>
            <div><dt>Actividades</dt><dd>{ACTIVITIES.filter(activity => form.activeModules.includes(activity.id)).map(activity => activity.label).join(", ")}</dd></div>
            <div><dt>Plan elegido</dt><dd>{selectedPlan.name}</dd></div>
          </dl>
          {!registered && <><div className={styles.planNote}><ShieldCheck size={21} aria-hidden="true" /><div><strong>Crear tu cuenta es gratis</strong><p>{selectedPlan.id === "free" ? "Tu negocio empezará con acceso de evaluación." : "Tu negocio empezará con acceso de evaluación. Después podrás revisar el plan elegido en Facturación."}</p></div></div>
          <p className={styles.notice}>Si tu negocio ya está registrado, <Link href="/login">ingresa con tu cuenta</Link>.</p></>}
        </>}
        {notice && <section className={styles.pendingNotice} role="status" aria-label="Preparación de la cuenta">
          <h3>{notice.title}</h3><p>{notice.description}</p>
          <p>Solicita al equipo de Huella Nex revisar el negocio <strong>{form.slug}</strong>. No vuelvas a crear la cuenta ni compartas tu contraseña.</p>
          <a href={onboardingSupportHref(form.slug)}>Solicitar revisión por correo</a>
          <p>La conexión de WhatsApp y la habilitación de IA se configuran por separado.</p>
        </section>}
        {error && <div className={styles.alert} role="alert"><p>{error}</p>{step === 4 && <Link href="/login">Ir a iniciar sesión</Link>}</div>}
        <div className={styles.actions}>
          {step > 1 && !registered && <button className={styles.secondary} type="button" disabled={busy} onClick={() => move(step - 1)}><ArrowLeft size={16} aria-hidden="true" />Atrás</button>}
          {registered && !busy ? <Link className={styles.primary} href={signedIn ? "/dashboard" : "/login"}>{signedIn ? "Entrar a mi negocio" : "Iniciar sesión"}<ArrowRight size={16} aria-hidden="true" /></Link> : <button className={styles.primary} type="submit" disabled={busy || (step === 2 && !canContinueBusiness) || (step === 3 && !selectedPlan)}>
            {busy ? <><LoaderCircle size={17} aria-hidden="true" />Creando tu acceso…</> : <>{step === 4 ? "Crear mi cuenta" : step === 3 ? "Revisar registro" : "Continuar"}<ArrowRight size={17} aria-hidden="true" /></>}
          </button>}
        </div>
        {registered && signedIn && selectedPlan && selectedPlan.id !== "free" && <p className={styles.notice}><Link href={planDetailsHref(selectedPlan.id)}>Revisar plan {selectedPlan.name}</Link></p>}
        {step === 1 && <p className={styles.notice}>Con esta cuenta podrás configurar el negocio y dar acceso a tu equipo.</p>}
      </form>
    </RegistrationShell>
  );
}
