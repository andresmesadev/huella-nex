const express = require('express');
const request = require('supertest');
jest.mock('../../contexts', () => ({ receiptConceptCorrections: { context: jest.fn(), preview: jest.fn(), confirm: jest.fn() } }));
const { receiptConceptCorrections: workflow } = require('../../contexts');
const router = require('../../routes/dashboard/receipt-concept-corrections.routes');
function app(admin = true) {
  const a = express(); a.use(express.json());
  a.use((req, res, next) => { req.tenant = { tenantId: 'tenant-a' }; req.actor = { type: admin ? 'admin' : 'vet', staffId: 'verified-person' }; req.access = { capabilities: { administration: admin } }; next(); });
  a.use('/api/dashboard', router); return a;
}
const transaction = { id: 'receipt', tenantId: 'tenant-a', total: 100000, paymentMethod: 'transfer', paidAt: new Date(), createdAt: new Date(), items: [] };
beforeEach(() => { jest.clearAllMocks(); workflow.context.mockResolvedValue({ transaction, eligibleItemIds: [], corrections: [] }); workflow.preview.mockResolvedValue({ previewToken: 'x' }); workflow.confirm.mockResolvedValue({ transaction, correction: { id: 'proof' }, replayed: false }); });
test.each([['get', ''], ['post', '/preview'], ['post', '']])('nonadministrators cannot %s corrections%s', async (method, tail) => {
  expect((await request(app(false))[method]('/api/dashboard/transactions/receipt/concept-corrections' + tail).send({})).status).toBe(403);
  expect(workflow.context).not.toHaveBeenCalled(); expect(workflow.preview).not.toHaveBeenCalled(); expect(workflow.confirm).not.toHaveBeenCalled();
});
test('identity and transaction scope come from authentication and route; never the body', async () => {
  const body = { itemId: 'line', serviceId: 'bath', reason: 'Wrong service', tenantId: 'other' };
  const response = await request(app()).post('/api/dashboard/transactions/receipt/concept-corrections').set('Idempotency-Key', 'key').send(body);
  expect(response.status).toBe(200);
  expect(workflow.confirm).toHaveBeenCalledWith({ tenantId: 'tenant-a', actor: { type: 'admin', staffId: 'verified-person' }, transactionId: 'receipt', command: body, operationKey: 'key' });
  expect(response.body.transaction.id).toBe('receipt');
});
test('returns a fresh mapped receipt with history', async () => {
  const response = await request(app()).get('/api/dashboard/transactions/receipt/concept-corrections');
  expect(response.status).toBe(200); expect(response.body.transaction.total).toBe(100000); expect(response.body.corrections).toEqual([]);
});
test('preview conflicts are actionable rather than a generic failure', async () => {
  workflow.confirm.mockRejectedValue({ status: 409, code: 'PREVIEW_CHANGED', message: 'Refresh preview' });
  const response = await request(app()).post('/api/dashboard/transactions/receipt/concept-corrections').send({});
  expect(response.status).toBe(409); expect(response.body.code).toBe('PREVIEW_CHANGED');
});
test('an unexpected result asks the client to retry the same request', async () => {
  workflow.confirm.mockRejectedValue(new Error('database disconnected'));
  const response = await request(app()).post('/api/dashboard/transactions/receipt/concept-corrections').send({});
  expect(response.status).toBe(503); expect(response.body.code).toBe('RESULT_UNCERTAIN');
});
