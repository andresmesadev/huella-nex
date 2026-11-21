# Restauración aislada con reaplicación automática de supresiones

Procedimiento preparado el 17/11/2026 por solicitud de Andrés. No desplegado ni activado en producción por este trabajo. Complementa `DATABASE_BACKUP_AND_RESTORE.md` y el diseño `docs/architecture/restore-suppression-replay-20261117.md`.

## Qué cambia

`scripts/restore-database-drill.sh` sigue restaurando a PostgreSQL temporal, sin puertos y con red `none`. Ahora exige un registro de supresiones externo al respaldo y una referencia SHA-256 confiable. Tras `pg_restore`, ejecuta obligatoriamente el helper antes de declarar éxito. No arranca el dashboard ni abre la base a usuarios.

El helper se ejecuta en un contenedor efímero que comparte únicamente el espacio de red del PostgreSQL offline recién creado. Usa la imagen backend local con Node y `pg`, el script y el registro montados de solo lectura. No recibe el entorno de la aplicación ni credenciales de proveedores. La base objetivo es explícita y no se toma de `DATABASE_URL`.

Si no hay registro, está alterado o vencido, contiene instrucciones no soportadas o encuentra referencias pendientes, el procedimiento falla y no produce un veredicto de restauración aprobada. No hay opción para omitir el control. Si se conserva un contenedor para diagnóstico, permanece aislado y no debe conectarse al servicio por ese solo hecho.

## Registro aprobado, independiente del respaldo

La persona responsable de privacidad conserva el registro completo y vigente de decisiones legítimas de supresión. La aprobación se acredita por el procedimiento humano correspondiente; poner `decision: approved` en un archivo no acredita por sí solo una autorización real.

Cada versión del registro identifica `registerId`, revisión, emisión y vencimiento (vigencia máxima de 24 horas), declara `complete: true` e incluye todas las decisiones pertinentes. Incluso un conjunto vacío necesita una revisión y declaración explícitas; no se infiere de un archivo inexistente.

La huella de la versión vigente se suministra desde una referencia de confianza fuera del conjunto de respaldo. No basta guardar un hash junto a un archivo que pueda modificarse con él. El operador debe confirmar que la referencia corresponde al registro actual completo, no a una copia antigua. Este cambio automatiza el replay y su verificación; no instala un sistema externo de publicación, firma o custodia del registro.

El archivo contiene identificadores necesarios para impedir que una copia reintroduzca los registros. Se conserva en un medio privado con acceso restringido y plazo justificado para esa finalidad; no se publica en Git. El recibo de ejecución contiene caso, revisión, huella y resultado, sin nombres, teléfonos ni datos de negocio.

## Operación soportada inicialmente

`erase-unreferenced-tenant-v1` elimina únicamente el conjunto exacto de Tenant, User, Pet, Staff y StaffCredential expresamente identificado en la entrada. Su uso exige que no existan otras filas del establecimiento ni referencias fuera de ese conjunto. No admite filtros libres, SQL, tablas o instrucciones añadidas al registro.

El helper verifica pertenencia, inspecciona tablas con `tenantId` y referencias de claves foráneas, y rechaza referencias o conservación pendientes. No deshabilita triggers ni borra comisiones, auditorías, cobros, historias o cierres. Las entradas de otro tipo se detienen hasta que exista una implementación revisada para ellas; no se omiten en silencio.

Se usa una transacción serializable para todo el registro y un bloqueo por registro. Un conflicto en una entrada posterior revierte las anteriores. La ausencia del conjunto se verifica y una segunda ejecución indica `already-absent`, sin recrear datos ni repetir efectos. La vigencia se vuelve a validar antes de commit.

## Preparación del entorno de recuperación

Además de `age` y Docker existentes, debe estar disponible una imagen backend local con Node/pg. El archivo del helper tiene que corresponder al checkout revisado. No se descarga ninguna imagen durante el replay. Se proporciona:

```text
HUELLA_RESTORE_SUPPRESSION_JOURNAL=/ruta/privada/registro-vigente.json
HUELLA_RESTORE_SUPPRESSION_SHA256=HUELLA_SHA256_CONFIABLE_DE_64_HEXADECIMALES
HUELLA_RESTORE_REPLAY_IMAGE=IMAGEN_BACKEND_LOCAL_REVISADA
```

Después se usa el comando de restauración existente con sus dos argumentos: carpeta absoluta del respaldo cifrado e identidad age. Las referencias de esta plantilla se completan en el entorno privado; no son valores ejecutables listos para copiar.

La CLI del helper usa `HUELLA_RESTORE_DATABASE_URL` explícita, limitada a loopback y a nombres de bases de restauración admitidos; no se utiliza como borrador general de producción. Si la URL contiene la credencial temporal del entorno aislado, se mantiene en el entorno privado y no en comandos, recibos ni logs.

## Antes de considerar disponible una recuperación real

1. Mantener el destino aislado y verificar respaldo, esquema y alcance de la recuperación.
2. Obtener el registro vigente completo desde su custodia externa y comprobar la referencia confiable y sus aprobaciones.
3. Ejecutar la restauración; exigir el recibo `verified: true`, la revisión esperada y el éxito del resto de controles de esquema.
4. Atender cualquier entrada bloqueada sin deshabilitar las restricciones ni conectar una base parcialmente revisada. Incorporar otras operaciones solo mediante implementación y pruebas revisadas.
5. Comprobar los controles operativos y de acceso que correspondan antes de habilitar un servicio. El éxito del ensayo no realiza esa habilitación.

## Alcance de este trabajo

Solo se ejecutan pruebas con registros ficticios y contenedores locales temporales. No se cambia producción, el respaldo automático, la cuenta R2, la versión publicada ni la información real de Mateos Pet. La adopción del procedimiento en un entorno real y la custodia del registro requieren preparación y autorización separadas.

## Custodia y actualidad de la revisión

Aplicar [custodia del registro](SUPPRESSION_REGISTER_CUSTODY.md) antes de la adopción real. El validador no consulta cuál es la última revisión: una revisión anterior todavía vigente puede ser formalmente válida. Confirmar registerId, revisión exacta y huella mediante la referencia vigente independiente antes de restaurar. El [ensayo sintético del 18/11](../audits/SUPPORT_SUPPRESSION_CUSTODY_REHEARSAL_20261118.md) comprueba discrepancias, pero no configura medios externos ni permisos reales.

