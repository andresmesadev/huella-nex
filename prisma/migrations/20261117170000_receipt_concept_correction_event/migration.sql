-- Additive catalog entry only. Historical receipts and commissions stay unchanged.
INSERT INTO "EventType" (id, name, "originContext", "payloadContractDescription", active, "createdAt")
VALUES ('receipt_concept_correction_v1', 'ConceptoDeCobroCorregido', 'Finanzas',
        'Revisión de servicio adicional: agregado, actor, motivo, antes/después y comisiones; importe y pago conservados.', true, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
