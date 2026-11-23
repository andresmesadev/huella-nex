const { createListCommissionsUseCase } = require("../application/use-cases/list-commissions.usecase");
const { InvalidCommissionInputError, StaffNotFoundError } = require("../domain/errors");

const row = (over = {}) => ({
  id: "c1", tenantId: "t1", staffId: "s1", staff: { name: "Laura" }, transactionItemId: null,
  service: null, appointment: { petName: "Luna", serviceType: "grooming", service: { name: "Baño" } },
  serviceCategory: "grooming", resolvedPrice: "50000", staffShare: "20000", businessShare: "30000",
  status: "active", voidReason: null, completedAt: new Date("2026-11-20T15:00:00Z"), ...over,
});

function build({ rows = [row()], staff = { id: "s1", tenantId: "t1" }, settled = null, closed = null } = {}) {
  const deps = {
    commissionRepository: { listForStatement: jest.fn().mockResolvedValue(rows) },
    staffRepository: { findById: jest.fn().mockResolvedValue(staff) },
    settlementCoverageReader: { findActiveCovering: jest.fn().mockResolvedValue(settled) },
    dailyCloseReader: { findByCivilDay: jest.fn().mockResolvedValue(closed) },
  };
  return { deps, execute: createListCommissionsUseCase(deps) };
}

const range = { from: "2026-11-01T00:00:00-05:00", to: "2026-12-01T00:00:00-05:00" };

test("never lists without an establishment", async () => {
  const { deps, execute } = build();
  await expect(execute({ tenantId: null, ...range })).rejects.toBeInstanceOf(InvalidCommissionInputError);
  expect(deps.commissionRepository.listForStatement).not.toHaveBeenCalled();
});

test("a professional from another establishment is not found and nothing is read", async () => {
  const { deps, execute } = build({ staff: { id: "s9", tenantId: "other" } });
  await expect(execute({ tenantId: "t1", staffId: "s9", ...range })).rejects.toBeInstanceOf(StaffNotFoundError);
  expect(deps.commissionRepository.listForStatement).not.toHaveBeenCalled();
});

test("reads only the authenticated tenant and maps amounts, origin and lock state", async () => {
  const { deps, execute } = build({ settled: { id: "set1" }, closed: null });
  const { commissions, truncated } = await execute({ tenantId: "t1", staffId: "s1", ...range });
  expect(deps.commissionRepository.listForStatement).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "t1", staffId: "s1" }));
  expect(truncated).toBe(false);
  expect(commissions[0]).toMatchObject({ id: "c1", staffName: "Laura", origin: "appointment", serviceName: "Baño", petName: "Luna", resolvedPrice: 50000, staffShare: 20000, settled: true, dayClosed: false });
});

test("voided commissions are never reported as settled", async () => {
  const { execute } = build({ rows: [row({ status: "voided", voidReason: "error" })], settled: { id: "set1" } });
  const { commissions } = await execute({ tenantId: "t1", ...range });
  expect(commissions[0]).toMatchObject({ status: "voided", settled: false, voidReason: "error" });
});

test("rejects an empty or inverted range", async () => {
  const { execute } = build();
  await expect(execute({ tenantId: "t1", from: range.to, to: range.from })).rejects.toBeInstanceOf(InvalidCommissionInputError);
});
