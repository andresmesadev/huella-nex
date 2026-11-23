const prisma = require("../lib/prisma");

const activeClient = { archivedAt: null };
const activePet = { archivedAt: null, owner: activeClient };

async function lockContactArchive(tx, tenantId) {
  const key = "contact-archive:" + tenantId;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS locked`;
}

async function setContactArchived({ tenantId, id, kind, archived }) {
  return prisma.$transaction(async (tx) => {
    await lockContactArchive(tx, tenantId);
    const model = kind === "pet" ? tx.pet : tx.user;
    const where = { id, tenantId };
    const select = kind === "pet"
      ? { archivedAt: true, owner: { select: { archivedAt: true } } }
      : { archivedAt: true };
    const contact = await model.findFirst({ where, select });
    if (!contact) return { status: 404, error: "Ficha no encontrada." };

    if (!archived && contact.owner?.archivedAt) {
      return { status: 409, error: "Restaura primero al propietario de esta mascota." };
    }
    if (Boolean(contact.archivedAt) === archived) return { archivedAt: contact.archivedAt };

    if (archived) {
      const linked = kind === "pet" ? { petId: id } : { OR: [{ userId: id }, { pet: { ownerId: id } }] };
      const [appointment, charge] = await Promise.all([
        tx.appointment.findFirst({
          where: { tenantId, ...linked, status: { in: ["pending", "confirmed", "arrived", "in_progress"] } },
          select: { id: true },
        }),
        tx.transaction.findFirst({
          where: { tenantId, ...linked, status: "active", paidAt: null },
          select: { id: true },
        }),
      ]);
      if (appointment) return { status: 409, error: "La ficha tiene citas abiertas. Resuélvelas antes de archivarla." };
      if (charge) return { status: 409, error: "La ficha tiene cobros pendientes. Resuélvelos antes de archivarla." };
    }

    const archivedAt = archived ? new Date() : null;
    const { count } = await model.updateMany({ where, data: { archivedAt } });
    return count ? { archivedAt } : { status: 404, error: "Ficha no encontrada." };
  });
}

module.exports = { activeClient, activePet, lockContactArchive, setContactArchived };
