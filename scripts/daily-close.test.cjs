const { test } = require('node:test');
const assert = require('node:assert/strict');
const { commissionPeriod, aggregateCommissions, commissionActivityLabel } = require('../frontend/lib/daily-close.ts');
test('civil day presets handle Mondays, Sundays, month/year and half-month boundaries', () => {
  assert.deepEqual(commissionPeriod('2026-10-19', 'day'), { from: '2026-10-19', to: '2026-10-19' });
  assert.equal(commissionPeriod('2026-11-01', 'week').from, '2026-10-26');
  assert.equal(commissionPeriod('2026-01-01', 'week').from, '2025-12-29');
  assert.equal(commissionPeriod('2026-10-15', 'fortnight').from, '2026-10-01');
  assert.equal(commissionPeriod('2026-10-16', 'fortnight').from, '2026-10-16');
  assert.equal(commissionPeriod('2026-10-19', 'month').from, '2026-10-01');
});
test('period sums snapshots and previews with cents, preserving individual records', () => {
  const days = [{ staffBreakdown: [{ staffId: 'a', count: 1, staffShare: 10.1, businessShare: 20 }] }, { staffBreakdown: [{ staffId: 'a', count: 2, staffShare: 0.2, businessShare: 1 }, { staffId: null, count: 1, staffShare: 3, businessShare: 2 }] }];
  assert.deepEqual(aggregateCommissions(days), [{ staffId: 'a', count: 3, staffShare: 10.3, businessShare: 21 }, { staffId: null, count: 1, staffShare: 3, businessShare: 2 }]);
  assert.equal(days[0].staffBreakdown[0].staffShare, 10.1);
});

test('the period labels grooming appointments separately from additional commission items', () => {
  const row = (groomingAppointments, additionalItems, staffShare) => ({
    staffBreakdown: [{ staffId: 'a', count: groomingAppointments + additionalItems, staffShare, businessShare: 0,
      activity: { groomingAppointments, otherAppointments: 0, additionalItems } }],
  });
  const [period] = aggregateCommissions([row(5, 1, 144000), row(7, 1, 198000), row(4, 2, 100000), row(7, 1, 188000)]);
  assert.equal(commissionActivityLabel(period), '23 citas de peluquería · 5 adicionales');
  assert.equal(period.staffShare, 630000);
  assert.equal(commissionActivityLabel({ count: 3 }), '3 conceptos con comisión');
});
