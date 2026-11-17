/**
 * ListDomainEventsUseCase — Consulta. Caso de uso 7 (Etapa 2).
 * Consulta Eventos de Dominio por tipo, rango de fechas y tenant.
 */
function createListDomainEventsUseCase({ domainEventRepository }) {
  return async function execute({ tenantId, eventTypeName = null, dateStart = null, dateEnd = null, aggregateId = null }, ctx) {
    if (aggregateId && !tenantId) throw new Error('Aggregate event history requires tenant');
    const filters = {
      tenantId,
      eventTypeName,
      dateStart: dateStart ? new Date(dateStart) : null,
      dateEnd: dateEnd ? new Date(dateEnd) : null,
      ...(aggregateId ? { aggregateId } : {}),
    };
    const domainEvents = ctx ? await domainEventRepository.listByFilters(filters, ctx) : await domainEventRepository.listByFilters(filters);
    return { domainEvents };
  };
}

module.exports = { createListDomainEventsUseCase };
