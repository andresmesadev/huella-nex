const router = require('express').Router();
const { mapTransaction } = require('./shared');
function errorResponse(res, error) {
  if (error.status && error.code) return res.status(error.status).json({ error: error.message, code: error.code });
  if (['CommissionDayClosedError', 'CommissionInActiveSettlementError'].includes(error.constructor?.name)) return res.status(409).json({ error: error.message, code: 'COMMISSION_CONSOLIDATED' });
  if (error.constructor?.name === 'InvalidCommissionInputError') return res.status(422).json({ error: error.message, code: 'INVALID_COMMISSION' });
  console.error('[ConceptCorrection]', error.constructor?.name);
  return res.status(503).json({ error: 'No se pudo comprobar el resultado. Reintenta la misma corrección antes de preparar otra.', code: 'RESULT_UNCERTAIN' });
}
function input(req) { return { tenantId: req.tenant?.tenantId, actor: req.actor, transactionId: req.params.id, command: req.body, operationKey: req.get('Idempotency-Key') }; }
router.use('/transactions/:id/concept-corrections', (req, res, next) => {
  if (!req.access?.capabilities.administration) return res.status(403).json({ error: 'Solo administración puede corregir conceptos cobrados.' });
  next();
});
router.get('/transactions/:id/concept-corrections', async (req, res) => {
  try {
    const result = await require('../../contexts').receiptConceptCorrections.context(input(req));
    res.json({ ...result, transaction: mapTransaction(result.transaction) });
  } catch (error) { errorResponse(res, error); }
});
router.post('/transactions/:id/concept-corrections/preview', async (req, res) => {
  try { res.json(await require('../../contexts').receiptConceptCorrections.preview(input(req))); }
  catch (error) { errorResponse(res, error); }
});
router.post('/transactions/:id/concept-corrections', async (req, res) => {
  try {
    const result = await require('../../contexts').receiptConceptCorrections.confirm(input(req));
    res.json({ ...result, transaction: mapTransaction(result.transaction) });
  } catch (error) { errorResponse(res, error); }
});
module.exports = router;
