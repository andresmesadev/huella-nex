const { InvalidCommissionInputError, StaffNotFoundError } = require("../../domain/errors");

const MAX_ROWS = 500;
// Nombre legible cuando la cita no tiene un servicio del catálogo.
const AREA_LABEL = { vet: "Consulta veterinaria", veterinary: "Consulta veterinaria", grooming: "Peluquería" };

/**
 * ListCommissionsUseCase — Consulta (C3, 23/11/2026).
 * Estado de comisiones de un establecimiento para un rango de fechas, opcionalmente
 * de un profesional. Lectura pura: no recalcula montos ni cambia estados.
 *
 * Aislamiento: el tenant es obligatorio (nunca se lista sin establecimiento) y el
 * profesional filtrado debe pertenecer a él, igual que en el Entregable 6.3.
 *
 * Cada fila indica si ya está consolidada en una liquidación activa o si su día
 * tiene Cierre del Día oficial: en ambos casos el ADR 009 impide corregirla.
 */
function createListCommissionsUseCase({ commissionRepository, staffRepository, settlementCoverageReader, dailyCloseReader }) {
  return async function execute({ tenantId, staffId = null, from, to }) {
    if (!tenantId) throw new InvalidCommissionInputError("Selecciona un establecimiento para consultar comisiones.");
    const start = new Date(from), end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new InvalidCommissionInputError("El rango de fechas no es válido.");
    }
    if (staffId) {
      const staff = await staffRepository.findById(staffId);
      if (!staff || staff.tenantId !== tenantId) throw new StaffNotFoundError(staffId);
    }

    const rows = await commissionRepository.listForStatement({ tenantId, staffId, from: start, to: end, limit: MAX_ROWS + 1 });
    const truncated = rows.length > MAX_ROWS;
    const page = rows.slice(0, MAX_ROWS);

    const settledCache = new Map(), closedCache = new Map();
    const settled = async row => {
      if (!row.staffId || row.status !== "active") return false;
      const key = `${row.staffId}|${row.completedAt.toISOString()}`;
      if (!settledCache.has(key)) settledCache.set(key, Boolean(await settlementCoverageReader.findActiveCovering(row.staffId, row.completedAt)));
      return settledCache.get(key);
    };
    const dayClosed = async row => {
      // Día civil de Colombia (UTC−5, sin horario de verano), como en el ADR 008.
      const key = new Date(row.completedAt.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
      if (!closedCache.has(key)) closedCache.set(key, Boolean(await dailyCloseReader.findByCivilDay(tenantId, row.completedAt)));
      return closedCache.get(key);
    };

    const commissions = [];
    for (const row of page) {
      commissions.push({
        id: row.id,
        staffId: row.staffId ?? null,
        staffName: row.staff?.name ?? null,
        completedAt: row.completedAt.toISOString(),
        origin: row.transactionItemId ? "sale" : "appointment",
        serviceName: row.service?.name ?? row.appointment?.service?.name ?? AREA_LABEL[row.appointment?.serviceType] ?? AREA_LABEL[row.serviceCategory] ?? "Servicio",
        petName: row.appointment?.petName ?? null,
        resolvedPrice: Number(row.resolvedPrice),
        staffShare: Number(row.staffShare),
        businessShare: Number(row.businessShare),
        status: row.status,
        voidReason: row.voidReason ?? null,
        settled: await settled(row),
        dayClosed: await dayClosed(row),
      });
    }
    return { commissions, truncated };
  };
}

module.exports = { createListCommissionsUseCase, MAX_COMMISSION_ROWS: MAX_ROWS };
