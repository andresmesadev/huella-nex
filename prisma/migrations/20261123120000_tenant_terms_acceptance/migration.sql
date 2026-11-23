-- Aceptación de Condiciones y Política de privacidad al registrar un establecimiento.
ALTER TABLE "Tenant" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "termsVersion" TEXT;
