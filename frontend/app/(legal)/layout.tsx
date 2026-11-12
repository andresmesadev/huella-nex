import Link from "next/link";
import { ProductBrand } from "@/components/brand/product-brand";
import { publicLegalIdentity } from "@/lib/public-legal-identity";

export const dynamic = "force-dynamic";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  publicLegalIdentity();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-8 gap-y-4 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Huella Nex, inicio"><ProductBrand size="md" /></Link>
          <nav aria-label="Documentos de Huella Nex" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary">
            <Link className="underline underline-offset-4" href="/privacidad">Privacidad</Link>
            <Link className="underline underline-offset-4" href="/terminos">Condiciones</Link>
            <Link className="underline underline-offset-4" href="/eliminacion-de-datos">Eliminación de datos</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:leading-relaxed [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
        {children}
      </main>
    </div>
  );
}
