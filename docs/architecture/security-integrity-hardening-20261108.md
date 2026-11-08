# Refuerzo de integridad solicitado tras la revisión de Security

## Contrato y alcance

Se mantienen las entidades y reglas del modelo de dominio. El establecimiento
es la unidad de aislamiento; las correcciones conservan el historial. Este
parche incorpora esas reglas a PostgreSQL mediante una migración nueva, sin
reescribir datos ni migraciones históricas y sin convertir todo tenantId en NOT NULL.

Las referencias de mascotas, citas, sesiones/códigos, comisiones, liquidaciones,
ventas y registros clínicos deben pertenecer al mismo establecimiento. Se
conserva NULL→NULL para datos legacy y la categoría de servicio global. Un ítem
legacy sin tenantId hereda el ámbito de su transacción. La atribución histórica
de una comisión puede diferir del snapshot del artículo y su reemplazo puede
cambiar de profesional dentro del mismo establecimiento.

## Persistencia y concurrencia

La migración `20261108070000_security_integrity_guards` bloquea las tablas
afectadas durante su preflight y DDL, comprueba los datos existentes y aborta
atómicamente si encuentra inconsistencias. Las comprobaciones previas de solo
lectura están en `scripts/security-integrity-preflight.cjs`; requieren una URL
explícita y nunca usan DATABASE_URL implícitamente.

Los triggers comparan scopes con igualdad NULL-safe y bloquean los padres con
FOR SHARE. La migración instala sus objetos en el esquema seleccionado y las
referencias en runtime se califican con TG_TABLE_SCHEMA, sin resolver padres por
el search_path del cliente. Esto conserva los esquemas aislados del CI y evita
confundir registros con IDs iguales de esquemas distintos.
Las identidades de scope no se reasignan: tenantId, el petId de un
registro clínico y el transactionId de un artículo son estables. Se permiten
actualizaciones que repiten el mismo valor. Esto evita invalidar referencias
desde un padre o mediante carreras, sin congelar el contenido clínico editable.

Commission conserva su payload; permite la transición active→voided únicamente
con metadatos de anulación válidos, seguida de una nueva comisión. Las revisiones
clínicas, eventos de dominio y eventos de conexión son append-only; se bloquean
UPDATE/DELETE y TRUNCATE, permitiendo no-op updates. Las pruebas que antes borraban
eventos sintéticos conservan sus fixtures hasta descartar la base de pruebas.

CHECK valida rango de tasas, importes no negativos y suma de participaciones;
cantidad/precio/total de artículos; forma de horario semanal y ausencias; fechas
finitas y orden de periodos. FinancialPeriod admite un solo día (rango inclusivo);
Settlement requiere inicio anterior a fin (rango semiabierto). Los componentes
sin producto pueden tener precio cero. No se impone precio×tasa exacto por el
redondeo del reparto. Los CHECK exigen IS TRUE para rechazar valores NULL incompletos.

## Validación y publicación

Las regresiones reales PostgreSQL están en `scripts/security-integrity-postgres.test.cjs`.
Se prueban referencias cruzadas/NULL, updates de padres, historia, TRUNCATE,
importes/fechas y flujos legítimos, incluido un bloqueo entre dos conexiones.
Se ejecutan únicamente contra bases locales de prueba expresamente nombradas.
La transacción principal se revierte y los fixtures de concurrencia se descartan
con el contenedor. No se deshabilitan triggers para limpiar hechos inmutables.

La comprobación previa de producción del 08/11/2026 encontró cero infracciones
en 33 reglas; no acredita estados futuros. Antes de desplegar se debe repetir el
preflight, conservar respaldo y aplicar con migrate deploy durante una ventana
que tolere los locks de validación. El bloqueo puede esperar a transacciones
activas; la migración limita lock_timeout a 10 segundos y statement_timeout a
60 segundos para abortar/reprogramar si se excede la ventana.
Un rollback de aplicación no debe borrar el historial ni retirar
silenciosamente las restricciones. Este parche no autoriza despliegue por sí solo.
