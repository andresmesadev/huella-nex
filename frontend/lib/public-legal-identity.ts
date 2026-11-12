import { notFound } from "next/navigation";

export function publicLegalIdentity() {
  const name = process.env.HUELLA_NEX_LEGAL_NAME?.trim();
  const location = process.env.HUELLA_NEX_LEGAL_LOCATION?.trim();
  const address = process.env.HUELLA_NEX_LEGAL_ADDRESS?.trim();
  const phone = process.env.HUELLA_NEX_LEGAL_PHONE?.trim();
  const effectiveDate = process.env.HUELLA_NEX_LEGAL_EFFECTIVE_DATE?.trim();

  if (!name || !location || !address || !phone || !effectiveDate) notFound();

  return { name, location, address, phone, effectiveDate };
}
