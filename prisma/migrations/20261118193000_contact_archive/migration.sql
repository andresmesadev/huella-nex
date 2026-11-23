ALTER TABLE "User" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Pet" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "User_tenantId_archivedAt_idx" ON "User"("tenantId", "archivedAt");
CREATE INDEX "Pet_tenantId_archivedAt_idx" ON "Pet"("tenantId", "archivedAt");
