const { createGetFinancialHistoryUseCase } = require("../application/use-cases/get-financial-history.usecase");
const {
  createFakeDailyCloseRepository,
  createFakeTransactionRepository,
  createFakeExpenseRepository,
  createFakeCommissionReader,
} = require("./fakes");

function buildUseCase({ dailyCloses = [], charges = [], expenses = [], commissions = [] } = {}) {
  const dailyCloseRepository = createFakeDailyCloseRepository(dailyCloses);
  const transactionRepository = createFakeTransactionRepository(charges);
  const expenseRepository = createFakeExpenseRepository(expenses);
  const commissionReader = createFakeCommissionReader(commissions);
  return createGetFinancialHistoryUseCase({ dailyCloseRepository, transactionRepository, expenseRepository, commissionReader });
}

describe("GetFinancialHistoryUseCase", () => {
  test('distingue citas de peluquería y adicionales en cierres anteriores y días abiertos con los mismos importes', async () => {
    const staff = { tenantId: 't1', staffId: 'dayra', serviceCategory: 'grooming', status: 'active' };
    const snapshotRow = Object.freeze({ staffId: 'dayra', count: 2, staffShare: 29000, businessShare: 29000 });
    const dailyClose = { id: 'official', tenantId: 't1', date: new Date('2026-11-19T00:00:00Z'), incomeTotal: 117000, expenseTotal: 0, netAmount: 117000, staffBreakdown: [snapshotRow] };
    const execute = buildUseCase({ dailyCloses: [dailyClose], commissions: [
      { ...staff, appointmentId: 'grooming-19', staffShare: 25000, businessShare: 25000, completedAt: new Date('2026-11-19T20:30:00Z') },
      { ...staff, transactionItemId: 'extra-19', staffShare: 4000, businessShare: 4000, completedAt: new Date('2026-11-20T02:00:00Z') },
      { ...staff, appointmentId: 'grooming-20', staffShare: 22000, businessShare: 22000, completedAt: new Date('2026-11-20T05:00:00Z') },
      { ...staff, appointmentId: 'vet-20', serviceCategory: 'veterinary', staffShare: 16000, businessShare: 50000, completedAt: new Date('2026-11-20T15:00:00Z') },
      { ...staff, transactionItemId: 'void-20', status: 'voided', staffShare: 10000, businessShare: 10000, completedAt: new Date('2026-11-20T18:00:00Z') },
    ] });
    const { days } = await execute({ tenantId: 't1', rangeStart: '2026-11-19', rangeEnd: '2026-11-20' });
    expect(days[0].staffBreakdown).toEqual([{ ...snapshotRow, activity: { groomingAppointments: 1, otherAppointments: 0, additionalItems: 1 } }]);
    expect(days[0].dailyClose).toEqual(dailyClose);
    expect(snapshotRow).not.toHaveProperty('activity');
    expect(days[1].preview.staffBreakdown).toEqual([{ staffId: 'dayra', count: 2, staffShare: 38000, businessShare: 72000,
      activity: { groomingAppointments: 1, otherAppointments: 1, additionalItems: 0 } }]);
  });

  test('conserva el conteo histórico sin atribuirlo a citas si las filas actuales no concilian', async () => {
    const snapshotRow = { staffId: 'dayra', count: 2, staffShare: 29000, businessShare: 29000 };
    const execute = buildUseCase({ dailyCloses: [{ id: 'official', tenantId: 't1', date: new Date('2026-11-19T00:00:00Z'), incomeTotal: 0, expenseTotal: 0, netAmount: 0, staffBreakdown: [snapshotRow] }] });
    const { days } = await execute({ tenantId: 't1', rangeStart: '2026-11-19', rangeEnd: '2026-11-19' });
    expect(days[0].staffBreakdown).toEqual([snapshotRow]);
  });

  test("distingue días cerrados (hecho oficial) de días abiertos (vista preliminar)", async () => {
    const execute = buildUseCase({
      dailyCloses: [
        { id: "close-1", tenantId: "t1", date: new Date("2026-07-01T00:00:00.000Z"), incomeTotal: 500, expenseTotal: 0, netAmount: 500, staffBreakdown: [] },
      ],
      charges: [{ tenantId: "t1", total: 300, paidAt: new Date("2026-07-02T10:00:00Z"), origin: "manual_pos_sale" }],
    });
    const { days } = await execute({ tenantId: "t1", rangeStart: "2026-07-01", rangeEnd: "2026-07-02" });

    expect(days[0]).toMatchObject({ date: "2026-07-01", closed: true });
    expect(days[0].dailyClose.id).toBe("close-1");

    expect(days[1]).toMatchObject({ date: "2026-07-02", closed: false });
    expect(days[1].preview.incomeTotal).toBe(300);
  });

  test("la vista preliminar usa la misma regla de consolidación que el cierre oficial", async () => {
    const execute = buildUseCase({
      charges: [{ tenantId: "t1", total: 1000, paidAt: new Date("2026-07-01T10:00:00Z"), origin: "system_appointment_completed" }],
      expenses: [{ tenantId: "t1", amount: 200, date: new Date("2026-07-01T08:00:00Z"), status: "active" }],
    });
    const { days } = await execute({ tenantId: "t1", rangeStart: "2026-07-01", rangeEnd: "2026-07-01" });
    expect(days[0].preview.netAmount).toBe(800);
  });
});
