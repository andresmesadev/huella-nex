const { DigitalEmployeeNotFoundError } = require("../../domain/errors");

/**
 * GetAutonomyLimitsUseCase — Consulta (C2, 23/11/2026).
 * Límites de autonomía configurados para un Empleado Digital. El establecimiento
 * es obligatorio y el empleado debe pertenecer a él (mismo criterio que
 * configureAutonomyLimit). Lectura pura: la ausencia de un límite significa
 * "autoaprobado" (invariante del Entregable 5.3) y no se materializa aquí.
 */
function createGetAutonomyLimitsUseCase({ digitalEmployeeRepository }) {
  return async function execute({ digitalEmployeeId, tenantId }) {
    const employee = await digitalEmployeeRepository.findById(digitalEmployeeId);
    if (!tenantId || !employee || employee.tenantId !== tenantId) {
      throw new DigitalEmployeeNotFoundError(digitalEmployeeId);
    }
    const limits = await digitalEmployeeRepository.listAutonomyLimits(digitalEmployeeId);
    return { limits: limits.map(l => ({ action: l.action, autoApproved: l.autoApproved })) };
  };
}

module.exports = { createGetAutonomyLimitsUseCase };
