function redactAppointmentPrices(mapped) {
  return { ...mapped, hasResolvedPrice: mapped.finalPrice != null, finalPrice: null, priceResolution: null,
    payment: mapped.payment ? { ...mapped.payment, total: undefined } : mapped.payment,
    transport: { ...mapped.transport, price: null } };
}
module.exports = { redactAppointmentPrices };
