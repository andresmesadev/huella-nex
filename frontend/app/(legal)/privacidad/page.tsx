import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_SUPPORT_EMAIL } from "@/lib/product-brand";
import { publicLegalIdentity } from "@/lib/public-legal-identity";

export const metadata: Metadata = {
  title: "Política de privacidad | Huella Nex",
  description: "Tratamiento de datos personales en Huella Nex y canales para ejercer tus derechos.",
};

export default function PrivacyPage() {
  const identity = publicLegalIdentity();

  return (
    <article>
      <h1>Política de privacidad</h1>
      <p>Vigente desde el {identity.effectiveDate}.</p>
      <p>Huella Nex es una plataforma de gestión para negocios de mascotas. Esta política explica cómo tratamos los datos personales en la plataforma y en sus integraciones.</p>

      <h2>Responsable y contacto</h2>
      <p>{identity.name}, persona natural, es el responsable de los datos que Huella Nex recibe directamente para administrar cuentas, integraciones y soporte. Su domicilio es {identity.location}. La dirección de correspondencia es {identity.address}.</p>
      <p>Para consultas y reclamos de privacidad escribe a <a href={`mailto:${PRODUCT_SUPPORT_EMAIL}`}>{PRODUCT_SUPPORT_EMAIL}</a> o llama al <a href={`tel:${identity.phone.replace(/[^+\d]/g, "")}`}>{identity.phone}</a>.</p>
      <p>Cada establecimiento determina el tratamiento de los datos que registra sobre sus clientes y personal para prestar sus propios servicios. Huella Nex procesa esos registros para operar la plataforma conforme a las instrucciones autorizadas del establecimiento.</p>

      <h2>Datos y finalidades</h2>
      <ul>
        <li>Datos de contacto, cuenta, rol y sesión para autenticar usuarios, gestionar permisos y atender solicitudes de soporte.</li>
        <li>Datos de clientes y personal vinculados a citas, mascotas, servicios, cobros y otras operaciones para que el establecimiento pueda administrar su actividad.</li>
        <li>Cuando se autoriza Meta, la aplicación puede recibir información de perfil autorizada, identificadores de la cuenta comercial y del número de WhatsApp, y credenciales de integración. La conexión utiliza esos datos para identificar la cuenta autorizada y mantener la comunicación con Meta.</li>
        <li>Cuando el canal de WhatsApp está habilitado, se procesan el teléfono del remitente, los mensajes, las referencias a archivos de audio y los estados de entrega para mostrar conversaciones y permitir su atención. En el modo manual, una persona del equipo responde y puede reproducir las notas de voz.</li>
        <li>Registros técnicos y de auditoría para proteger el servicio, comprobar actuaciones autorizadas y resolver fallos.</li>
      </ul>

      <h2>Proveedores, acceso y conservación</h2>
      <p>Usamos proveedores de alojamiento y respaldo, correo de soporte y, para el canal autorizado, Meta y WhatsApp. Los servicios de IA pueden intervenir en funciones que el establecimiento habilite. Cada proveedor recibe la información necesaria para su función y puede procesarla desde los países en los que presta el servicio.</p>
      <p>El acceso se limita según el establecimiento y los permisos del usuario. Las credenciales de conexión con Meta se guardan cifradas. Conservamos los registros mientras sean necesarios para las finalidades descritas y, cuando corresponda, durante el tiempo exigido para obligaciones legales o para atender reclamaciones. Al finalizar esos motivos se revisa su supresión o anonimización. Los respaldos cifrados tienen su propio ciclo de rotación.</p>

      <h2>Tus derechos</h2>
      <p>Puedes consultar, actualizar y rectificar tus datos, solicitar prueba de tu autorización cuando corresponda, conocer el uso de tus datos y pedir la supresión o revocación de la autorización cuando proceda. Escribe al canal de privacidad e indica el establecimiento, si aplica. Si tu solicitud trata sobre la atención de un establecimiento, también puedes dirigirla a ese negocio.</p>
      <p>Consulta las <Link href="/eliminacion-de-datos">instrucciones para solicitar la eliminación de datos</Link>. Después de agotar el trámite de consulta o reclamo, puedes presentar una queja ante la Superintendencia de Industria y Comercio.</p>
      <p>Atendemos las consultas en un máximo de diez días hábiles desde su recibo y los reclamos completos en un máximo de quince días hábiles desde el día siguiente a su recibo. Si se necesita una prórroga, comunicaremos el motivo y la fecha de respuesta dentro de los límites de la <a href="https://jurinfo.jep.gov.co/normograma/compilacion/docs/ley_1581_2012.htm">Ley 1581 de 2012</a>.</p>
    </article>
  );
}
