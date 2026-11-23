class CommissionRepositoryPort {
  async create(_data) {
    throw new Error("CommissionRepositoryPort.create no implementado");
  }
  async listByStaffAndPeriod(_staffId, _periodStart, _periodEnd, _ctx, _tenantId) {
    throw new Error("CommissionRepositoryPort.listByStaffAndPeriod no implementado");
  }
  async listForStatement(_query, _ctx) {
    throw new Error("CommissionRepositoryPort.listForStatement no implementado");
  }
}

module.exports = { CommissionRepositoryPort };
