# Agenda de 20 minutos y servicios de 90 — caracterización del 18/11/2026

**Resultado: cadencia de recepción cada 20 minutos y duración de catálogo de 90 minutos comprobadas. Admisión de capacidad pendiente.** El ensayo reprodujo el comportamiento actual en 16 comprobaciones técnicas. Andrés confirmó después que las atenciones superpuestas sí son intencionales; por ello no se califica esa superposición como fallo del modelo elegido. Falta acordar capacidad simultánea y significado del cierre.

## Entorno

`NODE_PATH=C:/Users/andre/AppData/Roaming/npm/node_modules node scripts/verify-onboarding-local.cjs --servigroom-scheduling` (en PowerShell, asignar NODE_PATH antes de invocar node).

PostgreSQL temporal con migraciones desde cero, API del backend y proxy autenticado del dashboard, Chrome para alta e ingreso del fixture. Se reutilizó la compilación local existente; no se compiló ni certificó una versión publicada. Sin acceso a producción, mensajes, clientes reales ni datos de Mateos Pet. No se creó una cuenta para el negocio externo. Se verificó limpieza del contenedor propio y ausencia posterior de contenedores onboarding-check.

## Matriz observada

| Caso | Resultado real | Valoración |
| --- | --- | --- |
| Dos servicios principales de 90 minutos, sin precio fijo ni comisiones | Persisten duración 90, basePrice null y appliesCommissionSplit false; solo módulo grooming | Correcto para catálogo; no significa que la duración controle capacidad |
| Martes 06/01/2099, horario 09:00–17:00 | 24 inicios, cada 20 minutos, desde 09:00 hasta 16:40 | Correcta cadencia de recepción; no asegura fin del servicio antes del cierre |
| Domingo 04/01/2099 cerrado | Cero horarios | Correcto |
| Primera mascota 09:00, segunda mascota 09:20, servicios de 90 minutos y misma profesional | Segunda hora ofrecida incluso filtrando por profesional; ambas reservas HTTP 201 y asignación persistida al mismo staff | BLOQUEANTE si debe atender una a la vez; los intervalos esperados 09:00–10:30 y 09:20–10:50 se superponen |
| Tercera mascota al mismo inicio 09:00 | HTTP 409 | Protege el turno de recepción, no los 90 minutos completos |
| Nueva mascota 16:40 | HTTP 201; duración del servicio 90 | BLOQUEANTE si la atención debe acabar a las 17:00: finalizaría a las 18:10 |
| Día siguiente sin citas | 09:00 disponible | No se arrastra ocupación de otro día |
| Alta, sesión, aislamiento y revocación del harness | Comprobaciones base aprobadas | No sustituyen aceptación externa |

El ensayo principal de agenda se realizó por HTTP autenticado y lectura independiente de PostgreSQL; no se declara recorrido visual completo de selección de estos dos servicios en el formulario. No se ensayaron citas concurrentes de 90 minutos ni se corrigió su capacidad.

## Causa revisada

- `backend/src/lib/reservation-slot.js`: grooming usa 20 minutos de recepción, separados expresamente de la duración completa del catálogo.
- `availability-db.service.js`: disponibilidad y cierre usan ese bloque de 20 minutos.
- `staff-scheduling.service.js`: durationMs para grooming también retorna 20 minutos aunque Service.duration sea 90.
- `appointment.service.js`: exclusión transaccional de reservas comparte el bloque de recepción. Cambiar solo el formulario o filtrar horarios no resolvería el control de escritura ni los otros canales.

No se cambió esta regla global, que usan otros establecimientos. Tampoco se modificaron precios ni se puso precio cero para sortear validaciones.

## Decisión pendiente y siguiente corrección

Confirmar si los 20 minutos significan opciones de inicio para una sola atención simultánea, o recepciones superpuestas con capacidad explícita. Se preguntó a Andrés; no se asumió su respuesta.

Si se elige una atención a la vez, la política debe reservar 90 minutos de profesional, comprobar el final contra cierre y aplicarse de forma coherente en sugerencias, creación y reprogramación/concurrencia; mantener la política de recepción de otros negocios. Con rejilla desde 09:00 cada 20 minutos: después de 09:00–10:30 el siguiente inicio en esa rejilla es 10:40; el último inicio compatible con cerrar a las 17:00 es 15:20 (15:30 no pertenece a esa rejilla). Son cálculos de la alternativa propuesta, no comportamiento implementado ni aceptado todavía.

Si se eligen recepciones superpuestas, falta confirmar la organización/capacidad y el tratamiento de la última recepción; la duración informativa no evita sobrecarga por sí sola.

## Evidencia

- `.cache/servigroom-scheduling-20261118.log`: ejecución final, 16 comprobaciones y limpieza.
- `.cache/onboarding-verification/servigroom-scheduling-characterization.json`: resultados sintéticos, admissionApproved:false.
- `scripts/verify-servigroom-scheduling.cjs`: escenario reproducible integrado en el harness con bandera explícita.

Sintaxis de ambos verificadores y git diff --check aprobados (aviso de normalización LF/CRLF). No hubo commit, push ni despliegue; no se alteraron reglas del producto. El alta real y la activación de agenda quedan pendientes de resolver esta decisión de capacidad y los restantes controles de admisión.

## Decisión comunicada después del ensayo

Andrés eligió recepciones cada 20 minutos con atenciones superpuestas, sujetas a definir capacidad y organización con Nallely. La alternativa de una atención a la vez NO fue elegida y no debe implementarse por este informe. No se añade capacidad ni límites inventados. La cita 16:40 solo es incompatible si las 17:00 son fin de la atención; si son cierre de recepción, ese resultado requiere otra valoración. Pendientes máximo simultáneo (incluida espera) y última recepción/fin de atención. Sin activación real hasta resolverlo.

## Regla de cierre confirmada por Andrés

Se admite un último inicio a las 17:00 inclusive y se termina la atención aunque finalice después. Si no hay cita de las 17:00, el negocio cierra a esa hora. Por tanto, 16:40–18:10 es compatible con el modelo elegido. Brecha pendiente: el listado observado contiene 24 inicios hasta 16:40, no incluye el inicio 17:00. No se ha modificado la regla global ni vuelto a ensayar un POST a las 17:00 en este corte. Falta definir capacidad simultánea; no se da por configurada ni admitida la agenda real.


## Alcance estándar y capacidad corregidos por Andrés

Andrés solicitó dejar capacidad en 1 y evaluar el producto estándar de Básico/Pro, sin desarrollos Personalizados. Esta decisión reemplaza la aceptación anterior de superposición para la evaluación. El valor 1 se registra como requisito, no como capacidad aplicada: el comportamiento ensayado sigue permitiendo superposición. Ver [alcance de producto estándar](../operations/STANDARD_PLAN_EXTERNAL_BETA_SCOPE_20261118.md). No se modificó el código del producto ni se activó un plan.

