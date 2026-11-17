const prisma = require('../../../../lib/prisma');
const INCLUDE = {
  user: { select: { id: true, name: true, phone: true } }, pet: { select: { id: true, name: true, type: true } },
  items: { orderBy: { id: 'asc' }, include: { inventoryReturn: true } },
};
class PrismaReceiptConceptRepository {
  async read(tenantId, id, ctx) {
    return (ctx?.tx ?? prisma).transaction.findFirst({ where: { tenantId, id }, include: INCLUDE });
  }
  async lock(tenantId, id, ctx) {
    await ctx.tx.$queryRaw`SELECT id FROM "Transaction" WHERE id = ${id} AND "tenantId" = ${tenantId} FOR UPDATE`;
    return this.read(tenantId, id, ctx);
  }
  async service(tenantId, id, ctx) {
    return ctx.tx.service.findFirst({ where: { tenantId, id, active: true }, select: { id: true, name: true, updatedAt: true } });
  }
  async correct(tenantId, transactionId, itemId, { description, serviceId, performedByStaffId }, ctx) {
    return ctx.tx.transactionItem.update({ where: { id: itemId, transactionId, transaction: { tenantId } }, data: { description, serviceId, performedByStaffId } });
  }
}
module.exports = { PrismaReceiptConceptRepository };
