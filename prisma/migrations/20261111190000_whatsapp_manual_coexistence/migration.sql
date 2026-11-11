ALTER TABLE "WhatsAppConnection" ADD COLUMN "manualOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "whatsappAudioId" VARCHAR(128);
