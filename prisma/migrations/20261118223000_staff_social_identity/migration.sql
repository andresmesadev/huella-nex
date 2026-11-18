CREATE TABLE "StaffSocialIdentity" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "issuer" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffSocialIdentity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffSocialIdentity_provider_check" CHECK ("provider" IN ('google', 'microsoft-entra-id', 'apple')),
  CONSTRAINT "StaffSocialIdentity_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffCredential"("staffId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StaffSocialIdentity_provider_issuer_subject_key" ON "StaffSocialIdentity"("provider", "issuer", "subject");
CREATE UNIQUE INDEX "StaffSocialIdentity_staffId_provider_key" ON "StaffSocialIdentity"("staffId", "provider");
