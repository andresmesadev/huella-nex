# Corrección de servicio principal y domicilio — 17/11/2026

## 1. Definición funcional

Solicitud explícita del responsable: ampliar la corrección del comprobante al servicio principal y al domicilio, ajustar comisiones y conservar historial. Alcance confirmado por Andrés: «Concepto/profesional, conservando el total pagado». Se corrige identidad del servicio/profesional principal y descripción del domicilio; cantidad, importe de cada línea, total, medio, fecha y atribución del pago se conservan. La edición de valores queda fuera de esta solicitud.

El comprobante corrige lo cobrado por una atención completada; no reescribe la reserva, tarifa habitual, modalidad/dirección del traslado, ni la historia clínica. Es coherente con ADR 025: el recibo identifica el cobro definitivo y el snapshot original de cita permanece como antecedente. El domicilio se describe explícitamente y no genera comisión, aunque exista una tarifa o un servicio de catálogo con reparto de nombre parecido.

## 2. Casos y reglas

Administración selecciona una línea de servicio principal, adicional o domicilio de un comprobante activo y pagado. Solo los componentes explícitos service/transport identifican cargos de cita; no se infiere por nombre ni se reclasifican filas históricas automáticamente. Para el principal se exige cita del mismo establecimiento, completada y vinculada al comprobante; el concepto y profesional vigentes se resuelven desde la línea corregida o desde la cita cuando son referencias históricas nulas. Productos y componentes desconocidos se excluyen.

Principal/adicional: se selecciona un servicio activo del catálogo y profesional compatible cuando corresponda. La comisión se previsualiza con el contrato vigente y exclusivamente con el importe del servicio, nunca con domicilio u otros cargos. Se anula la comisión anterior y se crea la correspondiente cuando el servicio reparte. Principal mantiene origen cita; adicional mantiene origen línea. Se conserva la fecha original de generación de la comisión principal y se enlaza el reemplazo. El domicilio admite descripción explícita, sin profesional ni comisión; no se cambia su modalidad operativa ni su importe.

Motivo obligatorio, previsualización vigente, UUID e identidad de sesión se conservan. Cierres del día de pago/generación y liquidaciones de los profesionales afectados bloquean la corrección. Un cambio concurrente invalida la huella. Anulación, reemplazo, identidad de línea y certificado confirman o revierten juntos. Un reintento recupera el mismo resultado sin duplicarlo.

## 3. Arquitectura

Ampliar el workflow existente y el adaptador de lectura de Finanzas con la referencia de cita, sin crear otro editor ni otro libro de comisiones. Staff amplía su preparación/registro a principal explícitamente autorizado por el workflow, reutilizando los términos de contrato ya compartidos. El registro tradicional de adicionales mantiene su contrato por defecto. La corrección de domicilio verifica cierre, pero no llama al registro de comisiones. El formulario presenta defaults efectivos del principal histórico y un campo de descripción para el domicilio. El botón aparece también en recibos compuestos únicamente por principal/domicilio.

## 4. Persistencia

No se añaden tablas ni columnas. Las referencias opcionales serviceId/performedByStaffId de TransactionItem pueden conservar la identidad corregida del principal. Commission mantiene exactamente una fuente: appointmentId para principal o transactionItemId para adicional. Los importes de sus filas son inmutables: se anulan y reemplazan. DomainEvent ConceptoDeCobroCorregido conserva línea original/nueva, fuente de comisión, actor, motivo, referencia/snapshot de cita y pago conservado. Los eventos anteriores siguen legibles y sus claves de reintento mantienen compatibilidad.

## 5. Validación

La validación del 17/11/2026 aprobó 2.306 pruebas en las 242 suites del backend y 310 comprobaciones auxiliares. PostgreSQL desechable verificó principal con referencias históricas nulas, cambio de profesional, comisión de origen cita con su fecha original, reemplazo enlazado, cuatro confirmaciones simultáneas con una sola corrección, rollback del certificado, liquidación activa y cierre del día original de comisión. La descripción de domicilio conservó la comisión principal y el snapshot de visita.

El navegador local, con respuestas ficticias, verificó la precarga del principal histórico, previsualización y confirmación de profesional, selección de domicilio, descripción, claves independientes y total. Se inspeccionaron capturas de escritorio y móvil de 390 px. El lint y build de producción pasaron. La página, servidor y base temporales se retiran al terminar la revisión.
