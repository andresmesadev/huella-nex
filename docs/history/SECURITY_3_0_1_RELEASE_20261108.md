# Seguridad e integridad — versión 3.0.1

Publicación autorizada por el responsable el 08/11/2026, después de revisar los
12 parches de Security y los tres grupos de integridad de esquema/migraciones.
Esta nota describe el contenido y las comprobaciones previas; la evidencia de
ejecución del despliegue se conserva aparte, con su commit e imágenes concretas.

Se corrigen el traversal del proxy autenticado, mutaciones del catálogo global,
cadenas de automatización sin límite, referencias extranjeras en comisiones,
ausencias y tareas, reserva pública fuera de disponibilidad, servicios retirados,
establecimientos suspendidos, persistencia del OTP, borrado de notas privadas
y exposición de payment.total. La verificación independiente clasificó los
12 hallazgos como corregidos en el checkout preparado.

La migración aditiva `20261108070000_security_integrity_guards` incorpora
pertenencia NULL-safe, protección del historial y CHECK financieros/temporales.
No reescribe datos históricos ni modifica migraciones anteriores; aborta
atómicamente si su preflight encuentra inconsistencias. Conserva categorías
globales, ítems legacy y los contratos de anulación/reemplazo y periodos.

Prevalidación: 239 suites / 2.162 tests backend; 59 tests PostgreSQL reales,
incluidos 42 de integridad/upgrade; 8 del proxy; lint/build frontend y
Prisma validate/generate sin fallos. La instalación desde cero aplica las
69 migraciones y Prisma diff no detecta diferencias. El preflight productivo
de solo lectura encontró cero infracciones en 33 reglas.

Antes de publicar: CI del commit concreto, respaldo cifrado verificado e imágenes
anteriores conservadas. La aplicación puede volver a las imágenes anteriores
si falla; la migración y los hechos históricos se conservan. Usar una ventana
que tolere los locks; abortar si no se pueden obtener a tiempo. Verificar luego
historial, catálogo, versión, permisos, agenda, caja y acceso público; no generar
pagos, mensajes ni datos clínicos de prueba en producción. Los indicadores de
WhatsApp/proveedores permanecen con sus valores anteriores.

Diseño y límites: `docs/architecture/security-integrity-hardening-20261108.md`.
Esta publicación no acredita un nuevo análisis exhaustivo del repositorio ni
una ventana nueva de 48 horas; la evidencia de estabilidad anterior conserva
su versión y alcance originales.
