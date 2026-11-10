// Stable category keys: preserve historical expenses; no automatic stock or commission movement.
const EXPENSE_CATEGORY_LABELS = Object.freeze({
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
});
const EXPENSE_CATEGORIES = Object.freeze(Object.keys(EXPENSE_CATEGORY_LABELS));
module.exports = { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS };
