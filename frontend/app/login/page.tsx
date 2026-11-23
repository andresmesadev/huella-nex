import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { ProductBrand } from "@/components/brand/product-brand";
import { LegalLinks } from "@/components/brand/legal-links";
import { PRODUCT_DESCRIPTOR } from "@/lib/product-brand";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-7 bg-muted/40 p-6">
      <Link href="/" aria-label="Huella Nex, inicio" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700">
        <ProductBrand size="lg" subtitle={PRODUCT_DESCRIPTOR} />
      </Link>
      <LoginForm socialError={Boolean(error && error !== "CredentialsSignin")} />
      <LegalLinks />
    </main>
  );
}
