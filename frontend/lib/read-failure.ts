/**
 * Traduce el resultado de una lectura fallida del backend a un motivo
 * comprensible, para no presentar un permiso denegado o una sesión vencida
 * como si el servidor estuviera caído.
 *
 * `status` es null cuando la conexión falló antes de recibir respuesta HTTP.
 */
export type ReadFailure = "unavailable" | "session" | "denied" | "suspended" | "rejected";

export function readFailure(status: number | null): ReadFailure {
  if (status === null || status >= 500 || status === 408 || status === 429) return "unavailable";
  if (status === 401) return "session";
  if (status === 402) return "suspended";
  if (status === 403) return "denied";
  return "rejected";
}

/** El peor motivo entre varias lecturas: una sesión vencida pesa más que una caída. */
export function worstReadFailure(statuses: (number | null)[]): ReadFailure {
  const order: ReadFailure[] = ["session", "suspended", "denied", "rejected", "unavailable"];
  const found = statuses.map(readFailure);
  return order.find(reason => found.includes(reason)) ?? "unavailable";
}

export const READ_FAILURE_MESSAGE: Record<ReadFailure, string> = {
  unavailable: "El servidor de datos no está disponible. Intenta de nuevo en unos segundos.",
  session: "Tu sesión ya no es válida. Vuelve a iniciar sesión para continuar.",
  suspended: "El establecimiento está suspendido. Revisa Plan y facturación para reactivarlo.",
  denied: "Tu perfil no tiene acceso a esta información en el establecimiento seleccionado.",
  rejected: "No se pudo cargar la información solicitada. Comprueba el establecimiento seleccionado e intenta de nuevo.",
};

/** Si reintentar tiene sentido; en los demás casos se ofrece otra salida. */
export const READ_FAILURE_RETRYABLE: Record<ReadFailure, boolean> = {
  unavailable: true, session: false, suspended: false, denied: false, rejected: true,
};
