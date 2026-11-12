import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_SUPPORT_EMAIL } from "@/lib/product-brand";
import { publicLegalIdentity } from "@/lib/public-legal-identity";

export const metadata: Metadata = {
  title: "Condiciones del servicio | Huella Nex",
  description: "Condiciones de uso de Huella Nex para establecimientos y sus equipos.",
};

export default function TermsPage() {
  const identity = publicLegalIdentity();

  return (
    <article>
      <h1>Condiciones del servicio</h1>
      <p>Vigentes desde el {identity.effectiveDate}. El servicio lo presta {identity.name}, persona natural con domicilio en {identity.location}.</p>

      <h2>Alcance del servicio</h2>
      <p>Huella Nex ofrece herramientas de agenda, clientes, mascotas, equipo, caja e inventario para negocios de mascotas. El administrador del establecimiento asigna accesos individuales y define quién puede usar cada función. El alcance, la duración y los cargos de un plan se acuerdan con el establecimiento antes de contratarlo.</p>

      <h2>Uso de la cuenta</h2>
      <p>Protege tus credenciales, usa los accesos asignados y registra únicamente información para la que tengas autorización. Comunica al equipo de soporte cualquier acceso inesperado. El establecimiento gestiona sus servicios, la exactitud de sus registros y el uso de los datos de sus clientes y personal.</p>

      <h2>Integraciones</h2>
      <p>Las conexiones con Meta y WhatsApp requieren autorización de un administrador del negocio y están sujetas a las condiciones y a la disponibilidad de Meta. El establecimiento debe respetar los permisos y las preferencias de sus contactos. Si habilita funciones de IA, el equipo debe revisar sus resultados antes de utilizarlos para tomar decisiones de atención.</p>

      <h2>Soporte y cierre de acceso</h2>
      <p>Para solicitar soporte, recuperar acceso o gestionar la salida del servicio, escribe a <a href={`mailto:${PRODUCT_SUPPORT_EMAIL}`}>{PRODUCT_SUPPORT_EMAIL}</a>. La entrega de datos, el cierre de acceso y las solicitudes de supresión se tramitan según su alcance y las obligaciones aplicables.</p>
      <p>Consulta la <Link href="/privacidad">política de privacidad</Link> y el <Link href="/eliminacion-de-datos">procedimiento de eliminación de datos</Link>. Estas condiciones se interpretan bajo la legislación colombiana y respetan los derechos irrenunciables aplicables.</p>
    </article>
  );
}
