# Preparación operativa de la beta manual — 18/11/2026

Estado: preparación interna; no habilita admisión con datos reales. No se creó el establecimiento real de la peluquería, no se enviaron mensajes y no se accedió a producción.

## Secuencia de establecimientos y evaluación

1. Equipo interno: usar exclusivamente tenants ficticios del laboratorio PostgreSQL temporal, con un segundo tenant de control para verificar aislamiento. El verificador existente crea sus fixtures; no hace falta registrar otro negocio en producción. No copiar ni exportar datos de Mateos Pet para poblarlo.
2. Participante externo: después de su aprobación, practicar en un entorno separado con datos ficticios. La persona ejecuta las tareas; registrar cada ayuda del operador. No atribuirle los resultados de la automatización.
3. Establecimiento real: alta dentro del alcance aceptado, con identidad, permisos, periodo y condiciones definidos. La carga real espera además la información y fundamento aplicables a los datos. No convertir los cobros de demostración en saldos iniciales reales.

## Controles operativos y decisiones pendientes

| Control | Preparado o comprobado | Condición pendiente para uso real |
| --- | --- | --- |
| Soporte | Andrés figura como responsable inicial; huellanex@nexoweb.co es el correo documentado | Acordar franja y objetivo de respuesta, responsable alternativo o ausencia de cobertura y probar recepción/respuesta con un destinatario autorizado. No se envió correo en este trabajo |
| Incidencias | Usar referencia HN-AAAAMMDD-NNNN y expediente privado por establecimiento | Acordar contacto acreditado y quién confirma resolución; no registrar claves ni datos de otros negocios |
| Contingencia | Registro alternativo y conciliación antes de reintentar una operación incierta | Elegir con la peluquería el medio alternativo y responsable de conciliar; no prometer atención continua |
| Exportación y acceso | Pruebas sintéticas de paquete, aislamiento, integridad y revocación existentes | Acordar alcance, destinatario acreditado, archivos adicionales, corte y confirmación de apertura |
| Conservación y supresión | El helper bloquea referencias e instrucciones no soportadas | Revisar plazos y excepciones por categoría; no interpretar salida como borrado de historial financiero |
| Custodia de supresiones | Procedimiento y replay local preparados | Designar custodio/aprobador y sustitución, medio privado externo al respaldo, permisos, referencia confiable separada y revisión vigente antes de restaurar. No crear un registro vacío para aparentar decisiones revisadas |
| Recuperación | Ensayo sintético previo de pg_restore y replay; sintaxis revalidada hoy | Revisar/publicar los cambios locales antes de adoptarlos; verificar imagen, esquema, recuperación y evidencia de la versión candidata. Nunca habilitar una copia con replay bloqueado |
| Admisión | Matriz y ficha externa disponibles | Confirmar publicación/estabilidad/recuperación aplicables a la fecha; aprobación y condiciones del negocio siguen pendientes |

## Ensayo de mesa interno preparado

Este guion está preparado, no ejecutado ni aceptado por un negocio externo. Toda ejecución usa referencias QA, personas ficticias y canal simulado.

| Caso | Actuación y resultado exigido | Evidencia a conservar |
| --- | --- | --- |
| Cobro con respuesta incierta | Consultar historial/comprobante antes de repetir; no duplicar el cobro | Referencias del intento, consulta y decisión |
| Interrupción del dashboard | Anotar operaciones en el medio alternativo; al volver conciliar una a una antes de ingresarlas | Listado alternativo y diferencias resueltas |
| Recuperación de acceso | Simular identidad pendiente: no recuperar hasta acreditación; tras recuperación autorizada verificar sesión anterior inválida y permisos originales | Caso y resultados sin contraseñas |
| Solicitud desde contacto desconocido | No entregar exportación ni cambiar destinatario por ese solo pedido | Verificación pendiente y canal acreditado requerido |
| Restauración con registro ausente o vencido | Mantener copia aislada y detener habilitación; obtener revisión vigente por la custodia definida | Rechazo y revisión posterior, sin omitir control |
| Acceso a otro establecimiento o diferencia sin explicación | Detener flujo afectado, preservar evidencia mínima y reproducir con fixtures | Incidencia, alcance y verificación de corrección antes de retomar |

Usar la [ficha existente](HUELLA_NEX_EXTERNAL_BUSINESS_EVALUATION_TEMPLATE.md) para la práctica externa. Registrar C1–C7, tiempos observados, ayuda, incidencias y conciliación. Inventario y comisiones se evalúan si forman parte de la oferta acordada; WhatsApp e IA quedan excluidos. No inventar métricas ni marcar como aprobado lo no realizado.

## Verificación local de este corte

- `node --test scripts/restore-suppression.test.cjs scripts/tenant-handover.test.cjs`: 9 pruebas aprobadas, 0 fallos en la ejecución con permisos para la carpeta real. Un primer intento restringido falló al crear la carpeta temporal; se resolvió con acceso a la ruta correcta, sin cambiar el código.
- `node --check` en replay-restore-suppressions.cjs, verify-protected-handover-erasure.cjs y verify-restore-suppression-shell.cjs: aprobados.
- `bash -n scripts/restore-database-drill.sh`: aprobado.
- `git diff --check`: sin errores de espacios; avisos de normalización LF/CRLF existentes.
- No se repitieron hoy las 30 comprobaciones de integración del 17/11: se conserva su fecha y alcance en el [informe](../audits/AUTOMATIC_SUPPRESSION_REPLAY_TEST_20261117.md).
- No hubo commit, push, despliegue, prueba de correo ni comprobación en vivo de la versión publicada en este corte. Los cambios de recuperación siguen locales. No se alteraron los cambios pendientes de Meta/frontend.

## Orden para continuar

1. Resolver custodia, canal de soporte y revisión del paquete local de recuperación; preparar publicación dentro de su alcance, sin mezclar cambios pendientes de Meta.
2. Ejecutar y documentar el ensayo de mesa con fixtures; mantener pendientes las verificaciones que requieren contactos o decisiones reales.
3. Al recibir aprobación, completar la [matriz de admisión](EXTERNAL_GROOMING_BETA_ADMISSION_20261117.md) y las condiciones privadas.
4. Observar la evaluación externa con datos ficticios y documentar decisión. Habilitar datos reales solo al cumplir los requisitos de admisión; no cerrar BETA-04/05/06/07 por esta hoja.

## Ensayo técnico ejecutado después de esta preparación

El 18/11 se ejecutó el recorrido integrado con 37 comprobaciones aprobadas y 9 unitarias aprobadas, solo datos ficticios. Ver [informe y límites](../audits/ASSISTED_BETA_FICTIONAL_BUSINESS_TEST_20261118.md). Esto no acredita la ejecución humana del ensayo de mesa ni la aceptación externa, y no cambia los pendientes de soporte, custodia y admisión.


## Soporte y custodia preparados

Ver [soporte](ASSISTED_BETA_SUPPORT_SETUP.md), [custodia](SUPPRESSION_REGISTER_CUSTODY.md) e [informe del ensayo](../audits/SUPPORT_SUPPRESSION_CUSTODY_REHEARSAL_20261118.md). Siete comprobaciones sintéticas y cuatro pruebas del validador aprobadas; horarios, suplencia, prueba real de correo y medios/cuentas de custodia pendientes. Sin activación en producción.

