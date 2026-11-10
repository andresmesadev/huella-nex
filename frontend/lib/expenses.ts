export const EXPENSE_CATEGORY_LABELS = {
  "inventory_purchases": "Compras para venta",
  "veterinary_supplies": "Insumos veterinarios",
  "grooming_supplies": "Insumos de peluquería",
  "supplies": "Insumos y productos",
  "laboratory": "Laboratorio y servicios externos",
  "transport": "Domicilios y transporte",
  "cleaning": "Aseo y desinfección",
  "maintenance": "Mantenimiento y reparaciones",
  "equipment": "Equipos y mantenimiento",
  "salary": "Personal",
  "rent": "Arriendo",
  "utilities": "Servicios",
  "software": "Software y suscripciones",
  "bank_fees": "Comisiones bancarias",
  "marketing": "Publicidad y promociones",
  "other": "Otros gastos"
} as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORY_LABELS;
export const EXPENSE_FORM_CATEGORIES: ExpenseCategory[] = ["supplies", "salary", "rent", "utilities", "equipment", "other"];
export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];
export const EXPENSE_CATEGORY_GROUPS: { title: string; categories: ExpenseCategory[] }[] = [
  {
    "title": "Compras e insumos",
    "categories": [
      "inventory_purchases",
      "veterinary_supplies",
      "grooming_supplies",
      "supplies"
    ]
  },
  {
    "title": "Operación y servicios",
    "categories": [
      "laboratory",
      "transport",
      "cleaning",
      "maintenance",
      "equipment"
    ]
  },
  {
    "title": "Personal y local",
    "categories": [
      "salary",
      "rent",
      "utilities"
    ]
  },
  {
    "title": "Administración",
    "categories": [
      "software",
      "bank_fees",
      "marketing",
      "other"
    ]
  }
];

const LEGACY_CATEGORY_COLORS: Partial<Record<ExpenseCategory, string>> = {
  supplies: 'bg-orange-500/15 text-orange-700', utilities: 'bg-blue-500/15 text-blue-700',
  rent: 'bg-purple-500/15 text-purple-700', salary: 'bg-pink-500/15 text-pink-700',
  equipment: 'bg-cyan-500/15 text-cyan-700', marketing: 'bg-yellow-500/15 text-yellow-700',
  other: 'bg-slate-500/15 text-slate-700',
};
export const EXPENSE_CATEGORY_COLORS = Object.fromEntries(EXPENSE_CATEGORIES.map(key => [key, LEGACY_CATEGORY_COLORS[key] ?? 'bg-muted text-foreground'])) as Record<ExpenseCategory, string>;

export type Expense = {
  id: string;
  tenantId: string | null;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
};
