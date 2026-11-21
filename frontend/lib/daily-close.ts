export type CommissionPeriod = "day" | "week" | "fortnight" | "month";
type CommissionActivity = { groomingAppointments: number; otherAppointments: number; additionalItems: number };
export type CloseStaff = { staffId: string | null; count: number; staffShare: number; businessShare: number; activity?: CommissionActivity };
export type CloseDay = { date: string; closed: boolean; incomeTotal: number; expenseTotal: number; netAmount: number; staffCommissionTotal: number; netAfterCommissions: number; staffBreakdown: CloseStaff[] };

export function commissionPeriod(date: string, period: CommissionPeriod) {
  const day = new Date(date + "T12:00:00Z");
  if (period === "week") day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  if (period === "fortnight") day.setUTCDate(day.getUTCDate() <= 15 ? 1 : 16);
  if (period === "month") day.setUTCDate(1);
  return { from: day.toISOString().slice(0, 10), to: date };
}

export function aggregateCommissions(days: CloseDay[]) {
  const staff = new Map<string, CloseStaff>();
  for (const day of days) for (const row of day.staffBreakdown) {
    const key = row.staffId ?? "unassigned";
    const previous: CloseStaff = staff.get(key) ?? { staffId: row.staffId, count: 0, staffShare: 0, businessShare: 0 };
    const activity = previous.activity || row.activity ? {
      groomingAppointments: (previous.activity?.groomingAppointments ?? 0) + (row.activity?.groomingAppointments ?? 0),
      otherAppointments: (previous.activity?.otherAppointments ?? 0) + (row.activity?.otherAppointments ?? 0),
      additionalItems: (previous.activity?.additionalItems ?? 0) + (row.activity?.additionalItems ?? 0),
    } : undefined;
    staff.set(key, { ...previous, count: previous.count + row.count,
      staffShare: (Math.round(previous.staffShare * 100) + Math.round(Number(row.staffShare) * 100)) / 100,
      businessShare: (Math.round(previous.businessShare * 100) + Math.round(Number(row.businessShare) * 100)) / 100,
      ...(activity ? { activity } : {}),
    });
  }
  return [...staff.values()];
}

export function commissionActivityLabel(row: CloseStaff) {
  const { groomingAppointments = 0, otherAppointments = 0, additionalItems = 0 } = row.activity ?? {};
  const unclassified = row.count - groomingAppointments - otherAppointments - additionalItems;
  return [
    groomingAppointments > 0 && `${groomingAppointments} ${groomingAppointments === 1 ? 'cita' : 'citas'} de peluquería`,
    otherAppointments > 0 && `${otherAppointments} ${otherAppointments === 1 ? 'cita' : 'citas'}${groomingAppointments > 0 ? ' de otro tipo' : ''}`,
    additionalItems > 0 && `${additionalItems} ${additionalItems === 1 ? 'adicional' : 'adicionales'}`,
    unclassified > 0 && `${unclassified} ${unclassified === 1 ? 'concepto' : 'conceptos'} con comisión`,
  ].filter(Boolean).join(' · ');
}
