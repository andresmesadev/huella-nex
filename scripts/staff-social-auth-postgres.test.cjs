const assert = require("node:assert/strict");
const { test } = require("node:test");
const { randomUUID } = require("node:crypto");

const db = new URL(process.env.DATABASE_URL);
assert(["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) && db.pathname === "/mateos_dev", "Requires isolated PostgreSQL");

const express = require("../backend/node_modules/express");
const request = require("../backend/node_modules/supertest");
const prisma = require("../backend/src/lib/prisma");
const { requireInternalToken } = require("../backend/src/middleware/requireInternalToken");
// This test exercises identity and registration, without provisioning unrelated employees/events.
require("../backend/src/services/tenant-provisioning.service").provisionDefaultDigitalEmployees = async () => ({ results: [] });
const social = require("../backend/src/routes/social-auth.routes");
const onboarding = require("../backend/src/routes/onboarding.routes");
const staffAuth = require("../backend/src/routes/staff-auth.routes");

test("Social enrollment is isolated by provider, issuer and subject", async t => {
  const priorEnvironment = process.env.NODE_ENV;
  // Exercise the production token check even though the database is a fixture.
  process.env.NODE_ENV = "production";
  t.after(() => {
    if (priorEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = priorEnvironment;
  });
  const app = express();
  app.use(express.json());
  const internalToken = randomUUID();
  process.env.INTERNAL_API_SECRET = internalToken;
  app.use("/internal", requireInternalToken, social, staffAuth);
  app.use("/public", onboarding);
  const post = (endpoint, body) => request(app).post("/internal/" + endpoint).set("x-internal-token", internalToken).send(body);

  const seed = randomUUID().slice(0, 12);
  const slug = "social-auth-" + seed;
  const makeRegistration = suffix => ({
    name: "Social fixture " + suffix, slug: slug + "-" + suffix, ownerName: "Fixture owner",
    email: slug + "-" + suffix + "@example.test", activeModules: ["grooming"],
  });
  const subject = "fixture-" + seed;
  const [google, microsoft, apple] = [
    { provider: "google", issuer: "https://accounts.google.com", subject },
    { provider: "microsoft-entra-id", issuer: "https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0", subject },
    { provider: "apple", issuer: "https://appleid.apple.com", subject },
  ];
  const tenantIds = [];
  try {
    const googleRegistration = makeRegistration("google");
    await request(app).post("/internal/social-register").send({ identity: google, registration: googleRegistration }).expect(401);
    await request(app).post("/public/register").send({ ...googleRegistration, password: "Strong fixture password", identity: google }).expect(400);
    await post("social-login", { ...google, issuer: "https://invalid.example.test" }).expect(400);
    await post("social-register", { identity: google, registration: { ...googleRegistration, password: "caller password" } }).expect(400);

    for (const identity of [google, microsoft, apple]) {
      const registration = makeRegistration(identity.provider);
      await post("social-login", { ...identity, email: googleRegistration.email }).expect(200, { state: "new" });
      const created = await post("social-register", { identity, registration }).expect(201);
      assert.equal(created.body.tenant.plan, "free");
      assert.equal(created.body.tenant.slug, registration.slug);
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: registration.slug } });
      tenantIds.push(tenant.id);
      const signedIn = (await post("social-login", { ...identity, email: "unrelated@example.test", role: "superadmin" }).expect(200)).body;
      assert.equal(signedIn.state, "linked");
      assert.equal(signedIn.tenantId, tenant.id);
      assert.equal(signedIn.email, registration.email);
      assert.equal(signedIn.role, "admin");
      assert.equal(signedIn.sessionVersion, 1);
      assert.equal(signedIn.isSuperAdmin, undefined);
      await post("staff-login", { email: registration.email, password: "caller password" }).expect(401);
      await post("social-register", { identity, registration: makeRegistration("duplicate-" + identity.provider) }).expect(409);
    }

    const unrelated = { ...google, subject: "other-" + subject };
    await post("social-login", { ...unrelated, email: googleRegistration.email }).expect(200, { state: "new" });
    await post("social-register", { identity: unrelated, registration: { ...makeRegistration("collision"), email: googleRegistration.email } }).expect(409);
    const otherIssuer = { ...microsoft, issuer: "https://login.microsoftonline.com/00000000-0000-0000-0000-000000000001/v2.0" };
    await post("social-login", otherIssuer).expect(200, { state: "new" });

    const regularRegistration = makeRegistration("password");
    const regularPassword = "Existing registration works";
    await request(app).post("/public/register").send({ ...regularRegistration, password: regularPassword }).expect(201);
    const regular = await prisma.tenant.findUniqueOrThrow({ where: { slug: regularRegistration.slug } });
    tenantIds.push(regular.id);
    const passwordAccess = (await post("staff-login", { email: regularRegistration.email, password: regularPassword }).expect(200)).body;
    assert.equal(passwordAccess.tenantId, regular.id);
    assert.equal(await prisma.tenant.count({ where: { slug: { startsWith: slug } } }), 4);

    await prisma.staffCredential.updateMany({ where: { email: googleRegistration.email }, data: { active: false } });
    await post("social-login", google).expect(403);
    assert.equal((await post("social-login", apple).expect(200)).body.tenantId, tenantIds[2]);
  } finally {
    try {
      await prisma.$transaction(async tx => {
        const created = await tx.tenant.findMany({ where: { slug: { startsWith: slug } }, select: { id: true } });
        const where = { tenantId: { in: created.map(t => t.id) } };
        await tx.staffCredential.deleteMany({ where: { staff: where } });
        await tx.staff.deleteMany({ where });
        await tx.tenant.deleteMany({ where: { id: { in: created.map(t => t.id) } } });
      });
    } finally {
      await prisma.$disconnect();
    }
  }
});
