-- Additive security hardening. Existing legacy NULL scopes are preserved.
-- Preflight and DDL share one transaction; no historical data is rewritten.
BEGIN;
LOCK TABLE "Appointment", "ClientSession", "ClientVerificationCode", "Commission", "FinancialPeriod", "MedicalRecord", "Pet", "Service", "ServiceCategory", "Settlement", "Staff", "StaffAvailability", "Tenant", "Transaction", "TransactionItem", "User" IN SHARE ROW EXCLUSIVE MODE;
DO $preflight$
BEGIN
  IF (SELECT count(*)::int AS violations FROM "Pet" c LEFT JOIN "User" p ON p.id=c."ownerId" WHERE c."ownerId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Pet.ownerId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Service" c LEFT JOIN "ServiceCategory" p ON p.id=c."categoryId" WHERE c."categoryId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId" AND p."tenantId" IS NOT NULL))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Service.categoryId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Appointment" c LEFT JOIN "User" p ON p.id=c."userId" WHERE c."userId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Appointment.userId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Appointment" c LEFT JOIN "Pet" p ON p.id=c."petId" WHERE c."petId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Appointment.petId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Appointment" c LEFT JOIN "Service" p ON p.id=c."serviceId" WHERE c."serviceId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Appointment.serviceId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Appointment" c LEFT JOIN "Staff" p ON p.id=c."staffId" WHERE c."staffId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Appointment.staffId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Transaction" c LEFT JOIN "User" p ON p.id=c."userId" WHERE c."userId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Transaction.userId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Transaction" c LEFT JOIN "Pet" p ON p.id=c."petId" WHERE c."petId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Transaction.petId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Transaction" c LEFT JOIN "Appointment" p ON p.id=c."appointmentId" WHERE c."appointmentId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Transaction.appointmentId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Transaction" c LEFT JOIN "Transaction" p ON p.id=c."replacesTransactionId" WHERE c."replacesTransactionId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Transaction.replacesTransactionId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "TransactionItem" c LEFT JOIN "Transaction" p ON p.id=c."transactionId" WHERE c."transactionId" IS NOT NULL AND (p.id IS NULL OR (coalesce(c."tenantId",(SELECT t."tenantId" FROM "Transaction" t WHERE t.id=c."transactionId")) IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:TransactionItem.transactionId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "TransactionItem" c LEFT JOIN "Service" p ON p.id=c."serviceId" WHERE c."serviceId" IS NOT NULL AND (p.id IS NULL OR (coalesce(c."tenantId",(SELECT t."tenantId" FROM "Transaction" t WHERE t.id=c."transactionId")) IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:TransactionItem.serviceId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "TransactionItem" c LEFT JOIN "Staff" p ON p.id=c."performedByStaffId" WHERE c."performedByStaffId" IS NOT NULL AND (p.id IS NULL OR (coalesce(c."tenantId",(SELECT t."tenantId" FROM "Transaction" t WHERE t.id=c."transactionId")) IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:TransactionItem.performedByStaffId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Commission" c LEFT JOIN "Staff" p ON p.id=c."staffId" WHERE c."staffId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Commission.staffId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Commission" c LEFT JOIN "Appointment" p ON p.id=c."appointmentId" WHERE c."appointmentId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Commission.appointmentId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Commission" c LEFT JOIN "TransactionItem" p ON p.id=c."transactionItemId" WHERE c."transactionItemId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM coalesce(p."tenantId",(SELECT t."tenantId" FROM "Transaction" t WHERE t.id=p."transactionId"))))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Commission.transactionItemId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Commission" c LEFT JOIN "Service" p ON p.id=c."serviceId" WHERE c."serviceId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Commission.serviceId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Commission" c LEFT JOIN "Commission" p ON p.id=c."replacesCommissionId" WHERE c."replacesCommissionId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Commission.replacesCommissionId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Settlement" c LEFT JOIN "Staff" p ON p.id=c."staffId" WHERE c."staffId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Settlement.staffId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Settlement" c LEFT JOIN "Settlement" p ON p.id=c."replacesSettlementId" WHERE c."replacesSettlementId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:Settlement.replacesSettlementId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "ClientSession" c LEFT JOIN "User" p ON p.id=c."userId" WHERE c."userId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:ClientSession.userId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "ClientVerificationCode" c LEFT JOIN "User" p ON p.id=c."userId" WHERE c."userId" IS NOT NULL AND (p.id IS NULL OR (c."tenantId" IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:ClientVerificationCode.userId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "MedicalRecord" c LEFT JOIN "Appointment" p ON p.id=c."appointmentId" WHERE c."appointmentId" IS NOT NULL AND (p.id IS NULL OR ((SELECT p."tenantId" FROM "Pet" p WHERE p.id=c."petId") IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:MedicalRecord.appointmentId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "MedicalRecord" c LEFT JOIN "Staff" p ON p.id=c."staffId" WHERE c."staffId" IS NOT NULL AND (p.id IS NULL OR ((SELECT p."tenantId" FROM "Pet" p WHERE p.id=c."petId") IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:MedicalRecord.staffId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "MedicalRecord" c LEFT JOIN "Staff" p ON p.id=c."createdByStaffId" WHERE c."createdByStaffId" IS NOT NULL AND (p.id IS NULL OR ((SELECT p."tenantId" FROM "Pet" p WHERE p.id=c."petId") IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:MedicalRecord.createdByStaffId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "MedicalRecord" c LEFT JOIN "Staff" p ON p.id=c."updatedByStaffId" WHERE c."updatedByStaffId" IS NOT NULL AND (p.id IS NULL OR ((SELECT p."tenantId" FROM "Pet" p WHERE p.id=c."petId") IS DISTINCT FROM p."tenantId"))) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: scope:MedicalRecord.updatedByStaffId' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Tenant" WHERE ("commissionSplitRate" BETWEEN 0 AND 1) IS NOT TRUE) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: security_tenant_split' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Commission" WHERE ("splitRate" BETWEEN 0 AND 1 AND "resolvedPrice" BETWEEN 0 AND 99999999.99 AND "staffShare" BETWEEN 0 AND 99999999.99 AND "businessShare" BETWEEN 0 AND 99999999.99 AND "staffShare" + "businessShare" = "resolvedPrice") IS NOT TRUE) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: security_commission_values' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Commission" WHERE ((status='active' AND "voidedAt" IS NULL AND "voidReason" IS NULL) OR (status='voided' AND "voidedAt" IS NOT NULL AND isfinite("voidedAt") AND "voidReason" IS NOT NULL AND length(btrim("voidReason"))>0)) IS NOT TRUE) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: security_commission_void_shape' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "Settlement" WHERE (isfinite("periodStart") AND isfinite("periodEnd") AND "periodStart" < "periodEnd") IS NOT TRUE) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: security_settlement_period' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "FinancialPeriod" WHERE (isfinite("periodStart") AND isfinite("periodEnd") AND "periodStart" <= "periodEnd") IS NOT TRUE) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: security_financial_period' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "TransactionItem" WHERE (quantity > 0 AND "unitPrice" BETWEEN 0 AND 99999999.99 AND total BETWEEN 0 AND 99999999.99 AND total = round(quantity::numeric * "unitPrice", 2)) IS NOT TRUE) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: security_item_values' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*)::int AS violations FROM "StaffAvailability" WHERE ((type='base_schedule' AND weekday IS NOT NULL AND weekday BETWEEN 0 AND 6 AND "startTime" IS NOT NULL AND "endTime" IS NOT NULL AND "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "startTime" < "endTime" AND "startAt" IS NULL AND "endAt" IS NULL) OR (type IN ('planned_absence','unplanned_absence') AND weekday IS NULL AND "startTime" IS NULL AND "endTime" IS NULL AND "startAt" IS NOT NULL AND "endAt" IS NOT NULL AND isfinite("startAt") AND isfinite("endAt") AND "startAt" < "endAt")) IS NOT TRUE) <> 0 THEN RAISE EXCEPTION 'Security integrity preflight failed: security_availability_shape' USING ERRCODE='23514'; END IF;
END $preflight$;

-- Runtime references bind to the triggering table schema, including isolated test schemas.
-- Locks on referenced rows and immutable scope identities prevent reparenting races.
CREATE FUNCTION security_integrity_scope(table_name text, row_data jsonb, scope_schema text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE parent_data jsonb; source_table text; source_id text;
BEGIN
  IF table_name='MedicalRecord' THEN
    source_table:='Pet'; source_id:=row_data->>'petId';
  ELSIF table_name='TransactionItem' THEN
    source_table:='Transaction'; source_id:=row_data->>'transactionId';
  ELSE
    RETURN row_data->>'tenantId';
  END IF;
  EXECUTE format('SELECT to_jsonb(p) FROM %I.%I p WHERE id=$1 FOR SHARE',scope_schema,source_table)
    INTO parent_data USING source_id;
  IF parent_data IS NULL THEN RAISE EXCEPTION 'Missing scope parent' USING ERRCODE='23503'; END IF;
  IF table_name='MedicalRecord' THEN RETURN parent_data->>'tenantId'; END IF;
  RETURN coalesce(row_data->>'tenantId',parent_data->>'tenantId');
END $$;

CREATE FUNCTION security_integrity_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_data jsonb:=to_jsonb(NEW); owner_scope text; parent_data jsonb;
  parent_scope text; reference jsonb; references_config jsonb:=TG_ARGV[0]::jsonb;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF row_data->'tenantId' IS DISTINCT FROM to_jsonb(OLD)->'tenantId'
      OR (TG_TABLE_NAME='MedicalRecord' AND row_data->'petId' IS DISTINCT FROM to_jsonb(OLD)->'petId')
      OR (TG_TABLE_NAME='TransactionItem' AND row_data->'transactionId' IS DISTINCT FROM to_jsonb(OLD)->'transactionId') THEN
      RAISE EXCEPTION 'Security scope identity cannot change' USING ERRCODE='23514',CONSTRAINT='security_scope_identity';
    END IF;
  END IF;
  EXECUTE format('SELECT %I.security_integrity_scope($1,$2,$3)',TG_TABLE_SCHEMA)
    INTO owner_scope USING TG_TABLE_NAME,row_data,TG_TABLE_SCHEMA;
  FOR reference IN SELECT value FROM jsonb_array_elements(references_config) LOOP
    IF row_data->>(reference->>0) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT to_jsonb(p) FROM %I.%I p WHERE id=$1 FOR SHARE',TG_TABLE_SCHEMA,reference->>1)
      INTO parent_data USING row_data->>(reference->>0);
    IF parent_data IS NULL THEN RAISE EXCEPTION 'Missing security scope reference' USING ERRCODE='23503'; END IF;
    EXECUTE format('SELECT %I.security_integrity_scope($1,$2,$3)',TG_TABLE_SCHEMA)
      INTO parent_scope USING reference->>1,parent_data,TG_TABLE_SCHEMA;
    IF owner_scope IS DISTINCT FROM parent_scope
      AND NOT (coalesce((reference->>2)::boolean,false) AND parent_scope IS NULL) THEN
      RAISE EXCEPTION 'Reference belongs to another establishment' USING ERRCODE='23514',CONSTRAINT='security_scope_reference';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "Appointment" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[["userId","User"],["petId","Pet"],["serviceId","Service"],["staffId","Staff"]]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "ClientSession" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[["userId","User"]]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "ClientVerificationCode" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[["userId","User"]]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "Commission" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[["staffId","Staff"],["appointmentId","Appointment"],["transactionItemId","TransactionItem"],["serviceId","Service"],["replacesCommissionId","Commission"]]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "MedicalRecord" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[["appointmentId","Appointment"],["staffId","Staff"],["createdByStaffId","Staff"],["updatedByStaffId","Staff"]]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "Pet" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[["ownerId","User"]]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "Service" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[["categoryId","ServiceCategory",true]]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "ServiceCategory" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "Settlement" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[["staffId","Staff"],["replacesSettlementId","Settlement"]]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "Staff" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "Transaction" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[["userId","User"],["petId","Pet"],["appointmentId","Appointment"],["replacesTransactionId","Transaction"]]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "TransactionItem" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[["transactionId","Transaction"],["serviceId","Service"],["performedByStaffId","Staff"]]');
CREATE TRIGGER security_scope_guard BEFORE INSERT OR UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION security_integrity_scope_guard('[]');

-- Historical Commission payload is immutable. Only the sanctioned void transition is mutable.
CREATE FUNCTION security_commission_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('DELETE','TRUNCATE') THEN
    RAISE EXCEPTION 'Commission history is immutable' USING ERRCODE='23514',CONSTRAINT='security_commission_immutable';
  END IF;
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  IF OLD.status<>'active' OR NEW.status<>'voided'
    OR (to_jsonb(NEW)-ARRAY['status','voidedAt','voidReason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','voidedAt','voidReason']) THEN
    RAISE EXCEPTION 'Only commission void metadata may change' USING ERRCODE='23514',CONSTRAINT='security_commission_immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER security_commission_history BEFORE UPDATE OR DELETE ON "Commission" FOR EACH ROW EXECUTE FUNCTION security_commission_history_guard();
CREATE TRIGGER security_commission_truncate BEFORE TRUNCATE ON "Commission" FOR EACH STATEMENT EXECUTE FUNCTION security_commission_history_guard();

CREATE FUNCTION security_append_only_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Security history is append-only' USING ERRCODE='23514',CONSTRAINT='security_history_immutable';
END $$;
CREATE TRIGGER security_append_only BEFORE UPDATE OR DELETE ON "MedicalRecordRevision" FOR EACH ROW EXECUTE FUNCTION security_append_only_guard();
CREATE TRIGGER security_no_truncate BEFORE TRUNCATE ON "MedicalRecordRevision" FOR EACH STATEMENT EXECUTE FUNCTION security_append_only_guard();
CREATE TRIGGER security_append_only BEFORE UPDATE OR DELETE ON "DomainEvent" FOR EACH ROW EXECUTE FUNCTION security_append_only_guard();
CREATE TRIGGER security_no_truncate BEFORE TRUNCATE ON "DomainEvent" FOR EACH STATEMENT EXECUTE FUNCTION security_append_only_guard();
CREATE TRIGGER security_append_only BEFORE UPDATE OR DELETE ON "WhatsAppConnectionEvent" FOR EACH ROW EXECUTE FUNCTION security_append_only_guard();
CREATE TRIGGER security_no_truncate BEFORE TRUNCATE ON "WhatsAppConnectionEvent" FOR EACH STATEMENT EXECUTE FUNCTION security_append_only_guard();
ALTER TABLE "Tenant" ADD CONSTRAINT "security_tenant_split" CHECK (("commissionSplitRate" BETWEEN 0 AND 1) IS TRUE);
ALTER TABLE "Commission" ADD CONSTRAINT "security_commission_values" CHECK (("splitRate" BETWEEN 0 AND 1 AND "resolvedPrice" BETWEEN 0 AND 99999999.99 AND "staffShare" BETWEEN 0 AND 99999999.99 AND "businessShare" BETWEEN 0 AND 99999999.99 AND "staffShare" + "businessShare" = "resolvedPrice") IS TRUE);
ALTER TABLE "Commission" ADD CONSTRAINT "security_commission_void_shape" CHECK (((status='active' AND "voidedAt" IS NULL AND "voidReason" IS NULL) OR (status='voided' AND "voidedAt" IS NOT NULL AND isfinite("voidedAt") AND "voidReason" IS NOT NULL AND length(btrim("voidReason"))>0)) IS TRUE);
ALTER TABLE "Settlement" ADD CONSTRAINT "security_settlement_period" CHECK ((isfinite("periodStart") AND isfinite("periodEnd") AND "periodStart" < "periodEnd") IS TRUE);
ALTER TABLE "FinancialPeriod" ADD CONSTRAINT "security_financial_period" CHECK ((isfinite("periodStart") AND isfinite("periodEnd") AND "periodStart" <= "periodEnd") IS TRUE);
ALTER TABLE "TransactionItem" ADD CONSTRAINT "security_item_values" CHECK ((quantity > 0 AND "unitPrice" BETWEEN 0 AND 99999999.99 AND total BETWEEN 0 AND 99999999.99 AND total = round(quantity::numeric * "unitPrice", 2)) IS TRUE);
ALTER TABLE "StaffAvailability" ADD CONSTRAINT "security_availability_shape" CHECK (((type='base_schedule' AND weekday IS NOT NULL AND weekday BETWEEN 0 AND 6 AND "startTime" IS NOT NULL AND "endTime" IS NOT NULL AND "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "startTime" < "endTime" AND "startAt" IS NULL AND "endAt" IS NULL) OR (type IN ('planned_absence','unplanned_absence') AND weekday IS NULL AND "startTime" IS NULL AND "endTime" IS NULL AND "startAt" IS NOT NULL AND "endAt" IS NOT NULL AND isfinite("startAt") AND isfinite("endAt") AND "startAt" < "endAt")) IS TRUE);
COMMIT;
