const assert = require("node:assert/strict");
const { test } = require("node:test");
const { randomUUID } = require("node:crypto");

const db = new URL(process.env.DATABASE_URL);
assert(["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) && ["/mateos_dev", "/archive_test"].includes(db.pathname), "Requires isolated PostgreSQL");

const express = require("../backend/node_modules/express");
const request = require("../backend/node_modules/supertest");
const prisma = require("../backend/src/lib/prisma");
const { allowVeterinaryDashboard } = require("../backend/src/middleware/allowVeterinaryDashboard");
const { createAppointment } = require("../backend/src/services/appointment.service");
const { PrismaPosReferencesReader } = require("../backend/src/contexts/finance/infrastructure/persistence/prisma-pos-references.reader");

test("Contact archive preserves history and keeps active lookup scoped", async () => {
  const ids = [randomUUID(), randomUUID()];
  const appFor = (tenantId, role) => {
    const app = express();
    app.use(express.json(), (req, _res, next) => {
      req.tenant = { tenantId };
      req.actor = { type: role };
      next();
    });
    app.use(allowVeterinaryDashboard);
    for (const route of ["clients", "pets", "search", "contact-archive"]) {
      app.use(require("../backend/src/routes/dashboard/" + route + ".routes"));
    }
    return request(app);
  };
  const api = appFor(ids[0], "admin");
  const tenantFilter = { tenantId: { in: ids } };
  const bookingDate = new Date("2026-12-18T22:00:00Z");

  try {
    for (const id of ids) {
      await prisma.tenant.create({ data: { id, slug: "archive-" + id, name: "Test archive", phone: "archive-" + id, activeModules: ["grooming"] } });
    }
    const [owner, otherOwner] = await Promise.all(ids.map(tenantId => prisma.user.create({
      data: { tenantId, name: "Fixture archive client", phone: "00009900" },
    })));
    const [pet, sibling] = await Promise.all(["Fixture archive pet", "Fixture second pet"].map(name => prisma.pet.create({
      data: { tenantId: ids[0], ownerId: owner.id, name, type: "dog" },
    })));
    const appointmentArgs = {
      tenantId: ids[0], userId: owner.id, petId: pet.id, petName: pet.name,
      petType: pet.type, serviceType: "grooming", date: bookingDate,
    };
    const appointment = await prisma.appointment.create({ data: { ...appointmentArgs, status: "confirmed" } });
    const clientPath = "/clients/" + owner.id;
    const petPath = "/pets/" + pet.id;
    const change = (path, archived) => api.put(path + "/archive").send({ archived });
    await appFor(ids[0], "receptionist").put(petPath + "/archive").send({ archived: true }).expect(403);
    await change("/clients/" + otherOwner.id, true).expect(404);
    await change(petPath, "true").expect(400);
    await change(petPath, true).expect(409, { error: "La ficha tiene citas abiertas. Resuélvelas antes de archivarla." });
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "completed" } });

    const charge = await prisma.transaction.create({ data: {
      tenantId: ids[0], userId: owner.id, petId: pet.id, appointmentId: appointment.id,
      total: "65000", paidAt: null, origin: "system_appointment_completed",
    } });
    await change(clientPath, true).expect(409, { error: "La ficha tiene cobros pendientes. Resuélvelos antes de archivarla." });
    await prisma.transaction.update({ where: { id: charge.id }, data: {
      status: "voided", voidedAt: new Date(), voidReason: "Fictitious test",
    } });

    const archivedPet = (await change(petPath, true).expect(200)).body;
    assert(archivedPet.archivedAt);
    assert.deepEqual((await change(petPath, true).expect(200)).body, archivedPet);
    const quickBeforeOwnerArchive = (await api.get("/clients").query({ search: "Fixture archive", limit: 8 }).expect(200)).body;
    assert.deepEqual(quickBeforeOwnerArchive[0].pets.map(p => p.id), [sibling.id]);

    assert((await change(clientPath, true).expect(200)).body.archivedAt);
    for (const [pathname, id] of [["/clients", owner.id], ["/pets", pet.id]]) {
      const active = (await api.get(pathname).expect(200)).body.data;
      assert(!active.some(contact => contact.id === id));
      const archives = (await api.get(pathname).query({ status: "archived", search: "Fixture" }).expect(200)).body.data;
      assert(archives.some(contact => contact.id === id));
      if (pathname === "/pets") assert(archives.some(contact => contact.id === sibling.id && contact.ownerArchived));
    }
    assert.deepEqual((await api.get("/clients").query({ search: "Fixture", limit: 8 }).expect(200)).body, []);
    assert.deepEqual((await api.get("/search").query({ q: "Fixture" }).expect(200)).body, { users: [], pets: [] });
    await api.get(petPath).expect(200);
    const client = (await api.get(clientPath).expect(200)).body;
    assert(client.appointments.some(row => row.id === appointment.id && row.status === "completed"));
    const preservedCharge = await prisma.transaction.findUniqueOrThrow({ where: { id: charge.id } });
    assert.equal(preservedCharge.status, "voided");
    assert.equal(preservedCharge.paidAt, null);
    assert.equal(preservedCharge.appointmentId, appointment.id);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: otherOwner.id } })).archivedAt, null);

    await assert.rejects(createAppointment({
      ...appointmentArgs, date: new Date(bookingDate.getTime() + 86400000), requireActiveContact: true,
    }), { code: "ARCHIVED_CONTACT" });
    const reference = new PrismaPosReferencesReader();
    await assert.rejects(prisma.$transaction(tx => reference.validate(ids[0], { petId: pet.id }, { tx })), /Mascota no encontrada/);
    await prisma.$transaction(tx => reference.validate(ids[0], { userId: owner.id, petId: pet.id, appointmentId: appointment.id }, { tx }, { completed: true }));

    await change(petPath, false).expect(409);
    await change(clientPath, false).expect(200, { archivedAt: null });
    assert.deepEqual((await api.get("/pets").expect(200)).body.data.map(p => p.id), [sibling.id]);
    await change(petPath, false).expect(200, { archivedAt: null });
    assert((await api.get("/pets").expect(200)).body.data.some(p => p.id === pet.id));
  } finally {
    try {
      await prisma.$transaction(async tx => {
        await tx.transaction.deleteMany({ where: tenantFilter });
        await tx.appointment.deleteMany({ where: tenantFilter });
        await tx.pet.deleteMany({ where: tenantFilter });
        await tx.user.deleteMany({ where: tenantFilter });
        await tx.tenant.deleteMany({ where: { id: { in: ids } } });
      });
    } finally {
      await prisma.$disconnect();
    }
  }
});
