const prisma = require("../../../../lib/prisma");
const { EscalationRepositoryPort } = require("../../application/ports/escalation-repository.port");

class PrismaEscalationRepository extends EscalationRepositoryPort {
  async create(data, ctx) {
    return (ctx?.tx ?? prisma).escalation.create({ data });
  }

  async findById(id) {
    return prisma.escalation.findUnique({
      where: { id },
      include: { agentTask: { include: { digitalEmployee: { select: { tenantId: true } } } } },
    });
  }

  async resolve(id, assignedStaffId) {
    return prisma.escalation.update({
      where: { id },
      data: {
        status: "atendida",
        resolvedAt: new Date(),
        ...(assignedStaffId ? { assignedStaffId } : {}),
      },
    });
  }

  async listPending(tenantId) {
    return prisma.escalation.findMany({
      where: {
        status: "pendiente",
        ...(tenantId ? { agentTask: { digitalEmployee: { tenantId } } } : {}),
      },
      // C2: la pantalla muestra qué empleado generó la escalación.
      include: { agentTask: { select: { digitalEmployee: { select: { id: true, specialization: true } } } } },
      orderBy: { createdAt: "asc" },
    });
  }
}

module.exports = { PrismaEscalationRepository };
