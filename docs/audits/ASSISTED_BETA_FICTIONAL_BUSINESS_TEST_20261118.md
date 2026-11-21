# Ensayo interno de negocio ficticio — 18/11/2026

Resultado: **37 comprobaciones de integración aprobadas, 0 fallos**, y **9 pruebas unitarias aprobadas, 0 fallos**. No se usaron datos reales de Mateos Pet ni se accedió a producción. No acredita aceptación de la peluquería externa.

## Ejecución y alcance

- Comando: `node scripts/verify-onboarding-local.cjs --assisted-beta-browser --appointment-lifecycle --protected-exit-drill`.
- `NODE_PATH=C:/Users/andre/AppData/Roaming/npm/node_modules`.
- PostgreSQL temporal desde cero, migraciones aplicadas y comparación contra esquema Prisma aprobada, backend local, Chrome headless y frontend compilado local ejecutado con Next start.
- Se reutilizó la compilación local existente (BUILD_ID `N9EJWkENb54YVqEUJCIAS`); no se hizo una nueva compilación ni se certificó el contenido publicado. HEAD `b88992e` con cambios locales pendientes. No hubo commit, push ni despliegue.
- Docker estaba detenido al primer intento; el fallo ocurrió antes de crear la base. Se inició Docker Desktop instalado y se repitió el ensayo completo con éxito.
- Proveedores externos desactivados por los fixtures; cero solicitudes externas observadas en los ciclos de negocios. No hubo mensajes, cargos reales ni acceso a cuentas de negocios reales.

## Resultados observados

| Área | Comprobación aprobada |
| --- | --- |
| Alta y acceso | Registro real desde navegador, credencial con hash, NextAuth, recuperación tras autoingreso fallido y protección ante altas duplicadas/concurrentes |
| Aislamiento | Tenant seleccionado o falsificado ajeno no concede acceso; tres negocios ficticios independientes; mismo código de producto sin mezcla de datos |
| Agenda | Cita duplicada rechazada; eliminación exige motivo/confirmación; cancelar conserva; cita creada, recibida, iniciada y completada desde interfaz |
| Caja/POS | Finalizar genera pendiente sin contabilizar dinero; pago mixto recupera borrador; segundo cobro rechazado; cierre móvil persistente y duplicado rechazado |
| Inventario | Una salida por venta; stock 5 a 4 en recorrido combinado; existencias independientes entre negocios |
| Comisiones | Solo sobre servicio, sin domicilio/producto; contrato anterior inmutable, cambio futuro y modalidad Direct comprobados |
| Peluquería exclusiva | Módulo grooming aislado, ingresos 140000, gasto 5000, reserva comisión 43000 y saldo tras reserva 92000; cierre y vistas móvil/escritorio conciliados |
| Soporte/acceso | Recuperación acotada al negocio; rechazo de cambio ajeno; credencial/sesión anterior inválidas; permisos conservados y revocación efectiva |
| Entrega | Exportación de solo lectura, relaciones y exclusiones comprobadas, destinatario ficticio HTTPS, cifrado y acceso autenticado de un uso/con vencimiento; alteración y clave ajena rechazadas |
| Supresión | Solo conjunto ficticio elegible sin referencias; historial protegido no borrable; otros negocios intactos |
| Restauración | Respaldo cifrado real a PostgreSQL offline; copia antigua reintroduce datos ficticios; replay obligatorio los elimina; registro ausente/corrupto bloquea éxito; conflicto revierte transacción e idempotencia comprobada |
| Limpieza | Archivos de entrega, respaldo y claves del ensayo retirados; contenedores del laboratorio y restauración retirados; búsqueda posterior por nombres del ensayo sin resultados |

## Conciliación del recorrido combinado

Servicio 60000 + domicilio 10000 + producto 5000 = ingreso 75000; efectivo 40000 y transferencia 35000. Gasto 5000; reserva de comisión 24000 (40% del servicio), saldo después de reserva 46000. Base 20000 y retenido 20000; efectivo esperado antes de pagar comisión 55000. Es cálculo con datos ficticios, no arqueo físico de una persona. Este recorrido habilita módulos adicionales; no obliga a incluirlos en la oferta de la peluquería.

## Evidencia local

- `.cache/assisted-beta-fictional-20261118.log`: ejecución final, 37 aprobadas y limpieza.
- `.cache/support-lifecycle/assisted-beta-browser.json`: conciliación y `externalAcceptance: false`.
- `.cache/support-lifecycle/business-cycles.json`: comparación de tres negocios.
- `.cache/support-lifecycle/protected-delivery-erasure.json`: entrega/supresión/restauración sintéticas.
- Capturas y árboles accesibles en `.cache/support-lifecycle/`.
- `node --test scripts/restore-suppression.test.cjs scripts/tenant-handover.test.cjs`: 9 aprobadas.

Los artefactos son locales y pueden reemplazarse en futuras ejecuciones; este informe conserva el corte y el alcance. El aviso de compatibilidad futura de consultas concurrentes en pg 9 no produjo fallos; no se actualizó esa dependencia.

## Decisión interna y pendientes

El recorrido técnico ensayado está aprobado en laboratorio. No se creó un tenant real para el participante ni se trasladaron los movimientos ficticios a producción. No se midió facilidad de uso con una persona externa y no se certificó recuperación desde R2 ni estabilidad de producción en esta ejecución.

Continúan pendientes: aprobación de la dueña, correo acreditado, condiciones/periodo/alcance y tratamiento de datos, horario y prueba real del canal de soporte, custodia del registro de supresiones, revisión/publicación de los cambios locales y comprobación de la versión candidata. Después corresponde la evaluación externa con la ficha existente. El ensayo no cierra por sí solo BETA-04/05/06/07.
