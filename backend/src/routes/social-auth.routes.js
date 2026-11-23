const express = require("express");
const prisma = require("../lib/prisma");
const { staffAccessRole } = require("../contexts/staff/domain/rules/staff-access.rules");
const { completeRegistration } = require("./onboarding.routes");

const router = express.Router();

function identityFromRequest(input) {
  const { provider, issuer, subject } = input ?? {};
  const validIssuer = provider === "google" ? issuer === "https://accounts.google.com"
    : provider === "apple" ? issuer === "https://appleid.apple.com"
    : provider === "microsoft-entra-id" && typeof issuer === "string" &&
      /^https:\/\/login\.microsoftonline\.com\/[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}\/v2\.0$/.test(issuer);
  if (!validIssuer || typeof subject !== "string" || !/^[!-~]{1,255}$/.test(subject)) return null;
  return { provider, issuer, subject };
}

router.post("/social-login", async (req, res) => {
  const identity = identityFromRequest(req.body);
  if (!identity) return res.status(400).json({ error: "Identidad inválida." });
  try {
    const link = await prisma.staffSocialIdentity.findUnique({
      where: { provider_issuer_subject: identity },
      select: { credential: { select: {
        active: true, email: true, sessionVersion: true,
        staff: { select: { id: true, tenantId: true, active: true, role: true, name: true, tenant: { select: { active: true } } } },
      } } },
    });
    if (!link) return res.json({ state: "new" });
    const { credential } = link;
    const { staff } = credential;
    const role = staffAccessRole(staff);
    if (!credential.active || !staff.active || !staff.tenantId || !staff.tenant ||
      !["admin", "vet", "groomer", "receptionist"].includes(staff.role) || (!staff.tenant.active && role !== "admin")) {
      return res.status(403).json({ error: "El acceso está desactivado." });
    }
    return res.json({
      state: "linked", staffId: staff.id, tenantId: staff.tenantId, name: staff.name,
      email: credential.email, role, sessionVersion: credential.sessionVersion,
    });
  } catch (error) {
    console.error("[SocialAuth] Login failed:", error.code ?? error.name);
    return res.status(503).json({ error: "El acceso social no está disponible. Vuelve a intentarlo." });
  }
});

router.post("/social-register", (req, res) => {
  const identity = identityFromRequest(req.body?.identity);
  if (!identity) return res.status(400).json({ error: "Identidad inválida." });
  return completeRegistration(req.body?.registration, res, identity);
});

module.exports = router;
