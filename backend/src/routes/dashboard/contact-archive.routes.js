const express = require("express");
const { setContactArchived } = require("../../services/contact-archive.service");

const router = express.Router();

for (const [path, kind] of [["/clients/:id/archive", "client"], ["/pets/:id/archive", "pet"]]) {
  router.put(path, async (req, res) => {
    const tenantId = req.tenant?.tenantId;
    if (!tenantId || !req.access?.capabilities.administration) {
      return res.status(403).json({ error: "Solo administración puede archivar o restaurar fichas." });
    }
    if (typeof req.body?.archived !== "boolean") {
      return res.status(400).json({ error: "Indica si deseas archivar o restaurar la ficha." });
    }

    const result = await setContactArchived({
      tenantId,
      id: req.params.id,
      kind,
      archived: req.body.archived,
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json(result);
  });
}

module.exports = router;
