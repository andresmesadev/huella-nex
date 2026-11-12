import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_SUPPORT_EMAIL } from "@/lib/product-brand";

export const metadata: Metadata = {
  title: "Eliminación de datos de usuario | Huella Nex",
  description: "Cómo solicitar la eliminación de datos personales y de datos obtenidos mediante Meta.",
};

export default function DataDeletionPage() {
  const emailLink = `mailto:${PRODUCT_SUPPORT_EMAIL}?subject=${encodeURIComponent("Solicitud de eliminación de datos en Huella Nex")}`;

  return (
    <article>
      <h1>Eliminación de datos de usuario</h1>
      <p>Puedes solicitar la eliminación de tus datos personales de Huella Nex, incluidos los que la aplicación haya recibido mediante una conexión autorizada con Facebook o WhatsApp Business.</p>
      <ol>
        <li>Envía la solicitud a <a href={emailLink}>{PRODUCT_SUPPORT_EMAIL}</a> con el asunto <strong>Solicitud de eliminación de datos en Huella Nex</strong>.</li>
        <li>Incluye tu nombre, un correo de respuesta y el establecimiento, si aplica. Describe qué información quieres eliminar e indica si se obtuvo mediante Facebook o WhatsApp Business. Utiliza el correo asociado a tu cuenta si puedes. Mantén las contraseñas, los códigos de verificación y los tokens fuera del mensaje.</li>
        <li>Verificaremos tu identidad y el alcance de la solicitud. Cuando un establecimiento determine el tratamiento de esos datos, coordinaremos la atención con él según corresponda.</li>
        <li>Te comunicaremos el resultado, los datos que se eliminaron o anonimizaron y, si aplica, qué información debe conservarse y por qué.</li>
      </ol>
      <p>El término general para atender un reclamo completo es de 15 días hábiles contados desde el día siguiente a su recibo. Si se necesita una prórroga, se informará el motivo y la fecha de respuesta, con un máximo de ocho días hábiles adicionales. <a href="https://jurinfo.jep.gov.co/normograma/compilacion/docs/ley_1581_2012.htm">Ley 1581 de 2012, artículo 15</a>.</p>
      <p>Si quieres retirar el acceso de la aplicación en Meta, puedes gestionarlo en las integraciones comerciales de Facebook. Para que revisemos y eliminemos los datos que Huella Nex ya recibió, envía la solicitud de esta página.</p>
      <p>Consulta la <Link href="/privacidad">política de privacidad</Link> para conocer las finalidades del tratamiento y los demás derechos.</p>
    </article>
  );
}
