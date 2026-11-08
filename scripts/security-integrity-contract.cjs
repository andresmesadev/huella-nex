// Shared, read-only preflight contract for the additive security-integrity migration.
// NULL-owned legacy objects match only other NULL-owned objects, except shared categories.
const relationships = {
  Pet: [['ownerId','User']],
  Service: [['categoryId','ServiceCategory',true]],
  Appointment: [['userId','User'],['petId','Pet'],['serviceId','Service'],['staffId','Staff']],
  Transaction: [['userId','User'],['petId','Pet'],['appointmentId','Appointment'],['replacesTransactionId','Transaction']],
  TransactionItem: [['transactionId','Transaction'],['serviceId','Service'],['performedByStaffId','Staff']],
  Commission: [['staffId','Staff'],['appointmentId','Appointment'],['transactionItemId','TransactionItem'],['serviceId','Service'],['replacesCommissionId','Commission']],
  Settlement: [['staffId','Staff'],['replacesSettlementId','Settlement']],
  ClientSession: [['userId','User']],
  ClientVerificationCode: [['userId','User']],
  MedicalRecord: [['appointmentId','Appointment'],['staffId','Staff'],['createdByStaffId','Staff'],['updatedByStaffId','Staff']],
};
const checks = [
 ['Tenant','security_tenant_split','"commissionSplitRate" BETWEEN 0 AND 1'],
 ['Commission','security_commission_values','"splitRate" BETWEEN 0 AND 1 AND "resolvedPrice" BETWEEN 0 AND 99999999.99 AND "staffShare" BETWEEN 0 AND 99999999.99 AND "businessShare" BETWEEN 0 AND 99999999.99 AND "staffShare" + "businessShare" = "resolvedPrice"'],
 ['Commission','security_commission_void_shape',`(status='active' AND "voidedAt" IS NULL AND "voidReason" IS NULL) OR (status='voided' AND "voidedAt" IS NOT NULL AND isfinite("voidedAt") AND "voidReason" IS NOT NULL AND length(btrim("voidReason"))>0)`],
 ['Settlement','security_settlement_period','isfinite("periodStart") AND isfinite("periodEnd") AND "periodStart" < "periodEnd"'],
 ['FinancialPeriod','security_financial_period','isfinite("periodStart") AND isfinite("periodEnd") AND "periodStart" <= "periodEnd"'],
 ['TransactionItem','security_item_values','quantity > 0 AND "unitPrice" BETWEEN 0 AND 99999999.99 AND total BETWEEN 0 AND 99999999.99 AND total = round(quantity::numeric * "unitPrice", 2)'],
 ['StaffAvailability','security_availability_shape',`(type='base_schedule' AND weekday IS NOT NULL AND weekday BETWEEN 0 AND 6 AND "startTime" IS NOT NULL AND "endTime" IS NOT NULL AND "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "startTime" < "endTime" AND "startAt" IS NULL AND "endAt" IS NULL) OR (type IN ('planned_absence','unplanned_absence') AND weekday IS NULL AND "startTime" IS NULL AND "endTime" IS NULL AND "startAt" IS NOT NULL AND "endAt" IS NOT NULL AND isfinite("startAt") AND isfinite("endAt") AND "startAt" < "endAt")`],
];
const quote = value => '"'+value.replaceAll('"','""')+'"';
function scope(table,alias) {
  if(table==='MedicalRecord') return `(SELECT p."tenantId" FROM "Pet" p WHERE p.id=${alias}."petId")`;
  if(table==='TransactionItem') return `coalesce(${alias}."tenantId",(SELECT t."tenantId" FROM "Transaction" t WHERE t.id=${alias}."transactionId"))`;
  return alias+'."tenantId"';
}
function preflightQueries() {
 const queries=[];
 for(const [table,refs] of Object.entries(relationships))for(const [field,target,global] of refs) {
  const mismatch=`${scope(table,'c')} IS DISTINCT FROM ${scope(target,'p')}`;
  queries.push({name:`scope:${table}.${field}`,sql:`SELECT count(*)::int AS violations FROM ${quote(table)} c LEFT JOIN ${quote(target)} p ON p.id=c.${quote(field)} WHERE c.${quote(field)} IS NOT NULL AND (p.id IS NULL OR (${mismatch}${global?' AND p."tenantId" IS NOT NULL':''}))`});
 }
 for(const [table,name,expr] of checks)queries.push({name,sql:`SELECT count(*)::int AS violations FROM ${quote(table)} WHERE (${expr}) IS NOT TRUE`});
 return queries;
}
module.exports={relationships,checks,preflightQueries,quote};
