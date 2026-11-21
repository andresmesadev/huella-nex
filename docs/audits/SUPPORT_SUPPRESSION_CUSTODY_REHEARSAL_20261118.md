# Soporte y custodia: ensayo preparatorio — 18/11/2026

Estado: procedimientos preparados; custodia externa y canal real de soporte pendientes. No se tocaron producción ni datos reales de Mateos Pet, no se envió correo ni se crearon decisiones reales de supresión.

## Entregables

- [Soporte de beta manual](../operations/ASSISTED_BETA_SUPPORT_SETUP.md): ficha de disponibilidad, atención por impacto, acuse no enviado, prueba de recepción/respuesta y cierre de casos.
- [Custodia del registro](../operations/SUPPRESSION_REGISTER_CUSTODY.md): responsables pendientes, medios independientes, publicación versionada, confirmación de revisión vigente, pérdida de referencia y controles antes de adopción.
- `scripts/verify-suppression-custody.cjs`: ensayo sintético reproducible, sin conexiones de base ni llamadas a proveedores. No es un publicador de registros reales.

## Resultado observado

`node scripts/verify-suppression-custody.cjs`: **7 comprobaciones aprobadas, 0 fallos**.

1. Registro ficticio vigente coincide con su referencia de revisión/huella.
2. Registro anterior aún vigente es válido para el validador de formato, pero no coincide con la referencia de la revisión actual.
3. Cambiar bytes y recalcular un hash acompañante no sustituye la referencia fijada.
4. Referencia ausente bloquea; no se infiere desde el respaldo.
5. Registro ausente bloquea; no significa cero decisiones.
6. Snapshot vencido bloquea aunque su hash coincida.
7. Revisión diferente bloquea aunque los bytes coincidan con el hash suministrado.

`node --test scripts/restore-suppression.test.cjs`: **4 pruebas aprobadas, 0 fallos**. Sintaxis del nuevo verificador aprobada. No se repitió la integración de 37 comprobaciones porque no se modificó el replay ni el producto.

Evidencia mínima local: `.cache/suppression-custody/result.json`; los archivos temporales se retiraron. El ejemplo vacío está marcado `QA-CUSTODY-NOT-REAL`; no constituye declaración de completitud sobre datos reales.

## Límites y pendientes

- La referencia y el registro del ensayo usan directorios separados en un mismo equipo y usuario: simulan separación lógica, no acreditan independencia de control, MFA, ACL o recuperación externa.
- La comprobación de última revisión está en el ensayo y en el procedimiento del operador. No se añadió al helper un servicio autenticado de consulta de última revisión ni protección automática frente a sustitución conjunta del registro y su referencia.
- Quedan pendientes designación de custodio/aprobador/suplencia, medios privados reales y referencia de confianza, pruebas de permisos y recuperación de dichos medios.
- Horarios, objetivo de respuesta, cobertura alternativa y envío/respuesta del soporte quedan pendientes. Se solicitaron datos a Andrés; no se asumieron respuestas.
- La práctica humana de contingencia y la aceptación externa siguen pendientes. No se declaran ejecutadas por haber redactado procedimientos o usado un simulador.
- Sin commit, push, despliegue ni nueva versión. El registro real no fue leído, creado ni reemplazado. El procedimiento no cierra BETA-04/05/06/07.
