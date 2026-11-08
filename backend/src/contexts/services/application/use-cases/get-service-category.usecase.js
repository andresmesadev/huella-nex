const { isCategoryEnabled } = require('../../domain/rules/service-category.rules');
const { ServiceNotFoundError } = require("../../domain/errors");

/**
 * GetServiceCategoryUseCase — Consulta. Resuelve el nombre de categoría de
 * un servicio, verificado dentro del tenant (mismo patrón canónico de
 * verificación de propiedad usado en toda la Fase 6). Único propósito:
 * permitir que un consumidor externo al contexto (Disponibilidad Real de
 * Horarios, Ecosistema) traduzca un serviceId al bucket de disponibilidad
 * correcto sin conocer la estructura interna de Servicios.
 */
function createGetServiceCategoryUseCase({ serviceRepository, serviceCategoryReader, businessConfigReader }) {
  return async function execute({ serviceId, tenantId, requireBookable = false }) {
    const service = await serviceRepository.findById(serviceId);
    if (!service || (tenantId && service.tenantId !== tenantId)) {
      throw new ServiceNotFoundError(serviceId);
    }
    const category = await serviceCategoryReader.findById(service.categoryId);
    if (requireBookable && (!service.active || !category || !isCategoryEnabled(category.name, await businessConfigReader.getActiveModules(tenantId)))) throw new ServiceNotFoundError(serviceId);
    return { categoryName: category?.name ?? null };
  };
}

module.exports = { createGetServiceCategoryUseCase };
