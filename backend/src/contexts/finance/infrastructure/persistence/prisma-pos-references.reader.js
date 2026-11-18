const { activeClient, activePet, lockContactArchive } = require('../../../../services/contact-archive.service');
const { InvalidTransactionOperationError } = require('../../domain/errors');
class PrismaPosReferencesReader {
  async validate(tenantId, { userId, petId, appointmentId }, ctx, { completed = false } = {}) {
    if (!ctx?.tx || !tenantId) throw new Error('POS references require tenant and transaction');
    const client = ctx.tx;
    const requireActive = !appointmentId;
    if (requireActive && (userId || petId)) await lockContactArchive(client, tenantId);
    if (userId && !await client.user.findFirst({ where: { id: userId, tenantId, ...(requireActive ? activeClient : {}) }, select: { id: true } })) throw new InvalidTransactionOperationError('Cliente no encontrado.');
    if (petId && !await client.pet.findFirst({ where: { id: petId, tenantId, ...(requireActive ? activePet : {}), ...(userId ? { ownerId: userId } : {}) }, select: { id: true } })) throw new InvalidTransactionOperationError('Mascota no encontrada para ese propietario.');
    if (appointmentId && !await client.appointment.findFirst({ where: { id: appointmentId, tenantId, ...(completed ? { status: 'completed' } : {}), ...(userId ? { userId } : {}), ...(petId ? { petId } : {}) }, select: { id: true } })) throw new InvalidTransactionOperationError('Cita no encontrada o todavía sin finalizar.');
  }
}
module.exports = { PrismaPosReferencesReader };
