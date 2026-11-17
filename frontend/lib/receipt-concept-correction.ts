import type { Transaction } from "./transactions";

// Presentation only; the server repeats eligibility, authorization and financial guards.
export function hasCorrectableConcept(transaction: Transaction) {
  return Boolean(transaction.paidAt && transaction.items.some(item => item.itemKind === "service" && !item.productId && (!item.appointmentComponent || ['service', 'transport'].includes(item.appointmentComponent))));
}
