# Replay automático de supresiones: validación del 17/11/2026

**Resultado final: 30 comprobaciones de integración y 4 pruebas del validador aprobadas, 0 fallos.** Se usaron exclusivamente registros ficticios, PostgreSQL temporal y herramientas locales existentes. No se conectó a producción ni se modificaron datos reales de Mateos Pet.

## Implementación local

- `scripts/replay-restore-suppressions.cjs`: registro externo con formato/versionado, hash confiable, vigencia y entradas aprobadas; replay SQL parametrizado y transaccional; verificación posterior y recibo mínimo.
- `scripts/restore-database-drill.sh`: el replay es obligatorio después de `pg_restore` y antes del veredicto de éxito. Sin registro/hash no continúa. Mantiene PostgreSQL offline y sin puertos.
- `scripts/restore-suppression.test.cjs`: validación de registro, integridad, caducidad, instrucciones desconocidas, duplicados y destinos no permitidos.
- `scripts/verify-protected-handover-erasure.cjs`: el replay manual anterior fue sustituido por el helper automático, con pruebas de transacción, alcance e idempotencia.
- `scripts/verify-restore-suppression-shell.cjs`: ejecuta el script shell real con respaldo age, helper en contenedor offline y comprobaciones negativas.

Diseño y límites: [arquitectura](../architecture/restore-suppression-replay-20261117.md). Instrucciones: [procedimiento operacional](../operations/RESTORE_SUPPRESSION_REPLAY.md).

## Evidencia de ejecución

```text
node --test scripts/restore-suppression.test.cjs
4 passed, 0 failed

node scripts/verify-onboarding-local.cjs --protected-exit-drill
Onboarding integration: 30 passed, 0 failed.
```

El log final está en `.cache/automatic-suppression-20261117.log` y los resultados estructurados en `.cache/support-lifecycle/protected-delivery-erasure.json`. El evento `automatic-replay` conserva la huella del registro y las comprobaciones sin nombres, teléfonos ni credenciales. La sintaxis shell y los archivos JavaScript se comprobaron localmente.

## Casos comprobados

| Caso | Resultado |
| --- | --- |
| Registro completo vacío, explícito y vigente | Se valida; ausencia de registro no se interpreta como cero supresiones |
| Hash ausente o distinto; datos alterados | Rechazo antes de ejecutar cambios |
| Registro incompleto, vencido, emitido en el futuro o con vigencia excesiva | Rechazo |
| Operación desconocida, campos extra, IDs repetidos o decisión no aprobada | Rechazo |
| Base distinta de las restauraciones permitidas | Rechazo antes de mutación |
| Identificadores de otro establecimiento | Rechazo y conservación de datos |
| Segunda entrada con referencias/historia de conservación | Falla el replay y revierte también la primera entrada elegible; se comprobó que esta reaparece por rollback y que los otros negocios no cambian |
| Registro legítimo sobre la copia antigua | Se elimina el conjunto ficticio elegible y se verifica su ausencia antes de éxito |
| Repetición y CLI | Segunda pasada `already-absent`; la CLI usa el mismo helper y verifica el resultado sin repetir efectos |
| Script shell con registro ausente o corrupto | Salida fallida, sin `restore drill passed` |
| Script shell con registro correcto y respaldo age real | Restauración completa en PostgreSQL de red `none`; helper automático con recibo `applied`; veredicto positivo solo después del replay |
| Otros negocios | Huellas de sus registros exportables intactas antes y después |
| Historial protegido | Los triggers permanecen activos; no se borra historial financiero para superar la prueba |
| Limpieza | Se retiraron el contenedor del laboratorio y el contenedor de restauración offline; las claves y los archivos de respaldo/entrega del ensayo se eliminaron por rutas acotadas |

La restauración protegida anterior sigue incluida: descifrado y apertura del paquete, integridad, rechazo de clave ajena y archivo alterado, revocación de accesos y comprobación de los otros negocios.

## Alcance de la automatización

La operación inicial soportada es `erase-unreferenced-tenant-v1`: un conjunto exacto de Tenant, User, Pet, Staff y StaffCredential sin otras referencias ni datos sujetos a revisión de conservación. Una supresión de otro tipo se bloquea, no se omite. No se implementó un borrado universal de establecimientos con actividad ni se cambiaron reglas de conservación.

La reaplicación y comprobación son automáticas en el procedimiento local de restauración. La aprobación de las decisiones, la custodia externa del registro y la obtención de la referencia vigente completa siguen siendo actuaciones operativas. El hash debe llegar desde una referencia confiable separada del respaldo; no basta un archivo y hash manipulables juntos. Se revalida la vigencia antes de commit.

El helper no abre la base al dashboard. La recuperación real conserva sus demás controles de acceso, esquema y habilitación. No se desplegaron estos cambios, no se configuró un registro real ni se cambió la copia automática o R2. No se modificó la versión publicada.
