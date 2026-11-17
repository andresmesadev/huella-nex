const { resolveContractRate } = require('../../domain/rules/contract-commission.rules');
const { compatibleRole, canProvideService } = require('../../domain/rules/service-scope.rules');
const { InvalidCommissionInputError } = require('../../domain/errors');

// Shared by preview and registration: a preview never approximates a contract rate.
async function resolveSaleServiceTerms({ tenantId, serviceId, staffId, historical = false, activeModules }, ctx, deps) {
  const { sourceReader, serviceCategoryReader, staffRepository, businessConfigReader } = deps;
  const service = await sourceReader.service(tenantId, serviceId, ctx);
  if (!service || (!historical && !service.active)) throw new InvalidCommissionInputError('Servicio ajeno, retirado o no encontrado.');
  const category = await serviceCategoryReader.getCategoryForService(serviceId, tenantId, ctx);
  if (!category) throw new InvalidCommissionInputError('Servicio ajeno o no encontrado.');
  if (activeModules && ['grooming', 'veterinary'].includes(category.name) && !activeModules.includes(category.name)) throw new InvalidCommissionInputError('El área de este servicio no está habilitada.');
  if (!category.appliesCommissionSplit && !staffId) return { category, splitRate: null };
  if (!staffId) throw new InvalidCommissionInputError('Selecciona el profesional que realizó el servicio.');
  const person = await staffRepository.findById(staffId, ctx);
  if (!person || person.tenantId !== tenantId || !person.active) throw new InvalidCommissionInputError('Selecciona el profesional activo que realizó el servicio.');
  const capabilities = await sourceReader.capabilities(staffId, serviceId, ctx);
  if (!compatibleRole(person, category.name) || !canProvideService(person, capabilities, serviceId)) throw new InvalidCommissionInputError('El profesional no tiene habilitado este servicio y área.');
  const splitRate = category.appliesCommissionSplit
    ? await resolveContractRate(person, category, () => businessConfigReader.getCommissionSplitRate(tenantId, category.id)) : null;
  return { category, splitRate };
}
module.exports = { resolveSaleServiceTerms };
