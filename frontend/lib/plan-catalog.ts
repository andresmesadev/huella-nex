export type PlanId = "free" | "basic" | "pro" | "custom";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  features: string[];
  /** Condiciones aún no confirmadas: se muestran aparte, sin marca de incluido. */
  pending?: string[];
  highlight?: boolean;
};

const OPERATIONAL_FEATURES = [
  "Gestión operativa de un establecimiento",
  "Agenda, clientes y mascotas según módulos habilitados",
  "Equipo con roles y permisos",
  "Caja, inventario y comprobantes operativos",
];
// Diferencia entre planes: créditos del agente de IA (decisión del 23/11/2026,
// sobre la base aceptada el 29/10/2026, ADR 033). El equipo de plataforma los
// asigna al habilitar la IA del negocio.
const AI_CREDITS = { free: "100 créditos de IA de prueba, una sola vez", basic: "1.000 créditos de IA al mes", pro: "3.000 créditos de IA al mes" } as const;

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Evaluación",
    price: "$0",
    period: "evaluación",
    features: [
      "Acceso de evaluación al dashboard según habilitación",
      "Gestión operativa según módulos y permisos",
      AI_CREDITS.free,
      "WhatsApp sujeto a habilitación",
    ],
  },
  {
    id: "basic",
    name: "Básico",
    price: "$49.000",
    period: "mes",
    highlight: true,
    features: [...OPERATIONAL_FEATURES, AI_CREDITS.basic],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$89.000",
    period: "mes",
    features: [...OPERATIONAL_FEATURES, AI_CREDITS.pro],
  },
  {
    id: "custom",
    name: "Personalizado",
    price: "A convenir",
    period: "cotización",
    features: [
      "Alcance acordado según las necesidades de tu negocio",
      "Propuesta y condiciones antes de contratar",
      "Precio definido mediante cotización",
    ],
  },
];

export function getPlan(value: unknown): Plan | undefined {
  return PLANS.find(plan => plan.id === value);
}

export function planDetailsHref(plan: PlanId) {
  return "/dashboard/billing#plan-" + plan;
}
