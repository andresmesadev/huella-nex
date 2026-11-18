export type PlanId = "free" | "basic" | "pro" | "custom";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
};

const OPERATIONAL_FEATURES = [
  "Gestión operativa de un establecimiento",
  "Agenda, clientes y mascotas según módulos habilitados",
  "Equipo con roles y permisos",
  "Caja, inventario y comprobantes operativos",
  "Cupo de IA por confirmar en la oferta",
];

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Evaluación",
    price: "$0",
    period: "evaluación",
    features: [
      "Acceso de evaluación al dashboard según habilitación",
      "Gestión operativa según módulos y permisos",
      "IA y WhatsApp sujetos a habilitación",
    ],
  },
  {
    id: "basic",
    name: "Básico",
    price: "$49.000",
    period: "mes",
    highlight: true,
    features: OPERATIONAL_FEATURES,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$89.000",
    period: "mes",
    features: OPERATIONAL_FEATURES,
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
