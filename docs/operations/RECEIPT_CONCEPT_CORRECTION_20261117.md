# Corrección de conceptos desde Caja — v3.2.0

## Uso

Administración abre Punto de venta → Historial de cobros → Comprobante → Corregir conceptos. Selecciona el servicio adicional, el servicio correcto y su profesional; escribe el motivo y previsualiza. La pantalla muestra la comisión anterior y la resultante antes de confirmar. El comprobante conserva cantidad, importes, medio, fecha de pago y atribución original del cobro.

La línea corregida mantiene su identidad. La comisión anterior se anula con motivo y se conserva; si corresponde comisión para el servicio correcto, se registra un reemplazo. El historial muestra responsable, fecha, motivo y antes/después. Si se pierde conexión, se debe usar «Reintentar misma corrección», que recupera el resultado sin duplicarlo.

Solo admite comprobantes activos y pagados, tanto manuales como de citas, con líneas adicionales clasificadas como servicio. El servicio principal de cita, domicilio, productos, precios, cantidades, devoluciones y reembolsos tienen sus procesos propios. No sustituye la corrección de una factura electrónica. Un cierre oficial o una liquidación vigente bloquean el cambio.

## Persistencia y seguridad

El workflow coordina Finanzas, Staff y Eventos sin acceso a datos de otro establecimiento. Revalida el permiso administrativo, módulos y referencias dentro de la transacción. Reutiliza las reglas reales de contratos para previsualizar y registrar la comisión. La confirmación exige una huella vigente y un UUID de operación vinculado a actor, establecimiento y comprobante.

La migración `20261117170000_receipt_concept_correction_event` añade únicamente el tipo de evento `ConceptoDeCobroCorregido`. No modifica columnas ni registros históricos. Corrección, anulación/reemplazo y certificado inmutable comparten una transacción serializable. La entrega posterior de eventos no vuelve a ejecutar el comando financiero.

Next.js y eslint-config-next se actualizan de 16.4.2 a 16.4.6 para resolver el aviso que bloqueó el build. Referencia: [aviso oficial GHSA-mfr8-8qww-v76h](https://github.com/advisories/GHSA-mfr8-8qww-v76h). La auditoría npm del frontend no encontró vulnerabilidades tras el parche.

## Validación local

- Backend completo: 242 suites y 2.287 pruebas aprobadas. En Windows se usaron dos workers y límite de memoria para evitar el fallo nativo del proceso único.
- Comprobaciones auxiliares del panel y operaciones: 310 aprobadas.
- Frontend: lint y build de producción aprobados; 36 páginas generadas y sin la ruta temporal de prueba.
- PostgreSQL desechable real: seis confirmaciones concurrentes recuperan una sola corrección; pago e importes conservados; rollback si falla el certificado; auditoría protegida contra UPDATE/DELETE; aislamiento, cierres y liquidaciones verificados.
- Navegador con datos ficticios: previsualización, comisión 5.000 → 0, total conservado, protección al salir y pérdida de conexión seguida de reintento con el mismo UUID y contenido. Vista de escritorio y móvil de 390 px revisadas.
- El servidor local, la página de prueba y el contenedor PostgreSQL temporal se retiran después de verificar.

El gasto de laboratorio solicitado en paralelo se corrigió de efectivo a transferencia mediante una operación privada independiente y lectura posterior; no forma parte de esta migración.

## Publicación y reversión

Publicar únicamente los archivos de esta funcionalidad; conservar los cambios locales ajenos. Esperar CI y desplegar mediante `scripts/deploy.sh`, preservando antes las imágenes de la revisión previa `7009e8d`. La nueva migración es aditiva y puede permanecer si fuera necesario restaurar esas imágenes. Verificar versión, estado de contenedores, salud pública, registro de migración y presencia de rutas; las pruebas de publicación no corrigen ni crean cobros reales.
