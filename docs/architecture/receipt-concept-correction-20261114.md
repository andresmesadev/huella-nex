# Corrección de conceptos cobrados desde Caja — 14/11/2026

## 1. Definición funcional

Andrés solicita corregir desde el panel el servicio adicional de un comprobante, junto con su comisión, para sustituir las intervenciones técnicas puntuales. Administración cambia servicio/profesional de una línea adicional ya pagada, conservando cantidad, precio, total, medio y fecha de pago. Debe revisar el resultado antes de confirmar y explicar el motivo. La corrección es auditable y recuperable tras un reintento.

Alcance inicial: servicios adicionales de catálogo, incluidos los previamente libres clasificados como servicio. Los productos con inventario, el servicio principal de cita y el transporte no se reclasifican con este comando; requieren su propio proceso operativo. No elimina líneas, devuelve dinero ni cambia importes. Se admiten cobros manuales y de cita activos y pagados. No es edición de una factura electrónica.

## 2. Casos de uso y reglas

Solo administración del establecimiento consulta la historia de corrección y prepara/confirma el cambio. Selecciona una línea elegible, servicio activo, profesional cuando corresponde y un motivo de 5–1.000 caracteres. El servidor deriva la descripción del catálogo. Previsualiza la comisión actual y la resultante reutilizando las reglas de contrato/categoría del contexto Staff; el usuario no envía tasas ni importes.

La confirmación vuelve a comprobar el comprobante, permisos, módulos, referencias, cierre del día y liquidaciones que cubran la comisión o al profesional. Una huella de la previsualización detecta cambios de línea, cobro o reparto. Una clave UUID conserva el resultado de la misma solicitud; reutilizarla con otro contenido es conflicto. Se anula la comisión anterior y se registra la correcta en la misma transacción que cambia la línea; si el servicio no reparte, no existe una nueva comisión. Las demás líneas, comisiones, cita y pago no cambian. Se conserva un evento inmutable con antes/después, motivo, actor y referencias. Se publica después del commit, sin repetir el comando si falla una notificación.

## 3. Arquitectura técnica

Workflow de Caja en `application/workflows/pos/`, coordinando puertos de Finanzas, Staff y Eventos existentes. Adaptador Prisma de Finanzas para bloqueo/lectura de comprobante y cambio limitado de identidad de servicio; Staff mantiene la única aplicación de reglas y comandos de comisión. Se extraen términos de comisión compartidos entre cotización y registro para evitar reglas duplicadas. Eventos certifica `ConceptoDeCobroCorregido` dentro de la transacción con identidad estable y entrega posterior.

Rutas administrativas por comprobante: GET historia/contexto, POST previsualización y POST confirmación. La identidad nunca proviene del body. El cliente utiliza `proxyUrl`, muestra importe inmutable y efecto sobre comisión y conserva la misma clave al reintentar un resultado incierto. Disponible desde Historial de cobros/Comprobante; muestra también la historia de cambios.

### Decisiones arquitectónicas diferidas

Reembolsos, cambios de cantidades/precios, productos/inventario, cambio del servicio principal de una cita y corrección de medios de pago desde esta pantalla quedan fuera del comando. No se abre una fase nueva, se incorpora otro proveedor ni se modifica WhatsApp. No se permite corregir una comisión consolidada mediante una excepción silenciosa.

## 4. Persistencia

Reutiliza Transaction/TransactionItem y Commission existentes. La línea mantiene su ID, importe y referencia al cobro. La comisión anterior se conserva anulada, nunca se reescriben sus importes. DomainEvent conserva la revisión y el recibo de idempotencia con huella de solicitud, actor, línea anterior/nueva y comisión anterior/nueva. Los eventos pueden consultarse por establecimiento, tipo y agregado Transaction. No se duplica un saldo ni se añade una tabla de facturas/revisiones.

El ID estable del evento deriva de establecimiento, comprobante, actor y UUID de solicitud. Solo ese actor/establecimiento puede recuperar la solicitud a través del comando. La certificación de la corrección y todas sus escrituras comparten transacción serializable con reintentos acotados; las publicaciones posteriores nunca disparan otra ejecución de negocio.

## 5. Esquema físico y validación

Una migración aditiva registra el nuevo tipo global de evento. No cambia el esquema Prisma ni requiere columnas nuevas. Se amplía el filtro interno de eventos con agregado y la consulta transaccional de evento por ID, manteniendo los contratos anteriores.

Validación: cambio de servicio con comisión→sin comisión y viceversa, cambio de profesional, preservación de importes/pago/otras líneas, motivo obligatorio, ausencia de referencias cruzadas, permisos, módulos, cierres, liquidaciones, rechazo de productos/componentes, huella obsoleta, idempotencia y contenido cambiado. Verificación PostgreSQL aislada de atomicidad, rollback y reintentos concurrentes; interfaz, lint y compilación antes de publicar. El gasto de laboratorio solicitado en el mismo mensaje se corrige operativamente por separado y no condiciona esta funcionalidad.
