# Validación técnica local para beta cerrada asistida — 17/11/2026

Resultado: **25 comprobaciones aprobadas, 0 fallos** en la ejecución final del dashboard manual. Es evidencia técnica local; no admite por sí sola datos reales de otro establecimiento ni acredita aceptación de un participante externo.

## Entorno y reproducción

- Huella Nex 3.3.0 en el árbol de trabajo actual, con cambios locales; no es una certificación de una versión publicada.
- Frontend compilado con `NEXT_VERIFY_BUILD=1` y `next build --webpack`; Next.js ejecutado con `next start`, Chrome headless y PostgreSQL temporal con migraciones desde cero.
- Verificador: `node scripts/verify-onboarding-local.cjs --general-business-cycles --assisted-beta-browser --appointment-lifecycle`.
- Playwright se localizó mediante `NODE_PATH=C:/Users/andre/AppData/Roaming/npm/node_modules`.
- Datos sintéticos. WhatsApp/IA desactivados y proveedores externos aislados por el fixture existente. No se modificó la operación de Mateos Pet ni se publicaron cambios.
- El contenedor temporal se retiró y se comprobó que no quedaban contenedores `onboarding-check-*` al finalizar.

## Casos y resultados

| Caso | Tipo y preparación | Resultado comprobado | Evidencia |
| --- | --- | --- | --- |
| Cuenta nueva y sesión | Navegador, registro público y NextAuth reales | Creación y acceso; validación de contraseña; recuperación del inicio de sesión; aislamiento y revocación de sesión | Capturas `01`–`06` y salida del verificador |
| Cita duplicada | API autenticada; mascota/servicio y horarios explícitos del negocio sintético | HTTP 409 con `DUPLICATE_PET_APPOINTMENT` | `verify-appointment-lifecycle-browser.cjs` |
| Eliminar cita por error | Navegador, agenda y base real temporal | Cancelar conserva cita; confirmar elimina con motivo/auditoría; ausencia tras recarga | `50-appointment-removal-mobile.png` |
| Crear e iniciar cita | Cliente, mascota, servicio, contrato y stock preparados por API/Prisma; cita creada desde la interfaz | Cita del día en hora pasada queda recibida, asignada y se inicia desde Inicio | `beta-01-booking.png` y su árbol accesible |
| Finalizar atención | Navegador | Cobro pendiente de $60.000; finalizar no equivale a dinero recibido | Verificación independiente en PostgreSQL |
| Cobrar servicio, domicilio y producto | Navegador, recuperación del borrador tras recarga | Un único cobro combinado de $75.000; comisión de $24.000 solo sobre el servicio; una salida de inventario | `beta-02-payment.png`, `beta-03-paid.png` y lecturas de PostgreSQL |
| Persistencia y segundo cobro | Agenda recargada y API autenticada | Pago visible en agenda; checkout de cita ya pagada rechaza con 409 | `beta-03-paid.png` y comprobación HTTP |
| Gasto, base y cierre | Navegador, cierre a 390 px | Gasto en efectivo $5.000, base $20.000, cierre persistido tras recarga y duplicado rechazado con 409 | `beta-04-close-review.png`, `beta-05-closed.png` |
| Tres establecimientos independientes | Preparación y operaciones por API autenticada, contraste PostgreSQL y visualización en navegador | Conciliación separada de veterinaria, peluquería y pet shop; seis accesos a inventario ajeno rechazados; mismo código de producto sin mezcla; sin errores de página ni solicitudes externas | `business-cycles.json` y capturas `*-closed-390/1440.png` |

Los archivos de evidencia están en `.cache/general-business-cycles/`. Son artefactos locales; los archivos `failure-*` conservan intentos anteriores y no representan el resultado de la ejecución final.

## Conciliación del recorrido desde interfaz

| Concepto | Importe / cantidad |
| --- | ---: |
| Servicio | $60.000 |
| Domicilio | $10.000 |
| Producto | $5.000 |
| Total recibido | $75.000 |
| Parte en efectivo | $40.000 |
| Parte en transferencia | $35.000 |
| Gasto pagado en efectivo | $5.000 |
| Reserva de comisión: 40% del servicio | $24.000 |
| Saldo de movimientos | $70.000 |
| Saldo tras reservar comisión, mostrado antes del cierre | $46.000 |
| Base registrada / efectivo retenido para próxima jornada | $20.000 / $20.000 |
| Stock inicial / final | 5 / 4 |

Efectivo físico **esperado por cálculo**, antes de cualquier pago al profesional: $20.000 + $40.000 − $5.000 = $55.000. No hubo arqueo físico humano. La reserva de comisión no acredita su pago ni se confunde con efectivo disponible. Detalle estructurado en `assisted-beta-browser.json`.

## Correcciones y límites

- Se corrigió previamente la firma GET de facturación; pasaron build/TypeScript y 15 pruebas de acceso/facturación. No se repitió esa compilación en este bloque porque solo cambiaron verificadores.
- Se actualizaron verificadores: registro directo en `/onboarding`, horarios ficticios explícitos, nombre accesible con estado y despliegue de «Otras acciones» para eliminar una cita. El fallo anterior del duplicado ocurría antes, por horario no disponible; no se debilitó el resultado esperado.
- La carga CSV volvió a pasar al corregir «1 propietarios» por «1 propietario». El escenario histórico amplio `--grooming-transport` se detuvo luego por controles de ficha que cambiaron; **no se declara aprobada esa suite completa**. El recorrido crítico de beta tiene ahora un verificador focalizado con la interfaz actual.
- Se conserva el aviso de compatibilidad futura de `pg`: consultas concurrentes en un mismo cliente quedarán obsoletas en pg 9. No causó fallos en la ejecución final; esta validación no incluye una actualización a pg 9.
- El negocio del recorrido combinado habilita también venta de productos. La peluquería con módulo exclusivo se comprueba separadamente en los ciclos generales.
- No se repitió toda la regresión backend, carga, seguridad exhaustiva, recuperación ni observación de estabilidad de producción.

## Condiciones antes de datos reales externos

Este bloque queda aprobado para su alcance local. Mantener separados:

1. La versión publicada que vaya a recibir al participante y su evidencia vigente de publicación, recuperación y estabilidad.
2. Las condiciones de admisión BETA-04/05/06 y la aceptación informada del negocio: alcance, prueba gratuita, duración, soporte, privacidad, recuperación y salida.
3. La aceptación operativa BETA-07: una persona del negocio externo realiza y concilia su recorrido; estas pruebas automáticas no la sustituyen.
4. WhatsApp e IA: fuera de este bloque y sujetos a BETA-08 si se incluyen en la oferta.

Referencias: `docs/audits/HUELLA_NEX_EXTERNAL_BETA_READINESS_20261030.md` y `docs/operations/HUELLA_NEX_EXTERNAL_BUSINESS_EVALUATION.md`.
