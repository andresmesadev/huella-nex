# Reaplicación automática de supresiones en restauraciones aisladas

Diseño de mantenimiento operacional solicitado el 17/11/2026. Sin cambios de dominio, esquema, migraciones ni despliegue. Solo se probará con datos ficticios en bases temporales.

## Contrato

La restauración existente permanece aislada (`--network none`, sin puertos). Antes de declarar éxito ejecuta un replay transaccional de un registro externo a la copia. El archivo se identifica por SHA-256 proporcionado desde una referencia de confianza separada del respaldo; tiene versión, vigencia y constancia explícita de cobertura completa. No se inventan aprobaciones ni se interpreta un registro ausente como vacío.

Acción inicial `erase-unreferenced-tenant-v1`: lista exacta de cliente/mascota/staff de un establecimiento sin otros datos referenciados. Las referencias restantes, registros de conservación, IDs de otro negocio y acciones desconocidas detienen todo el replay. No se deshabilitan triggers ni se usa SQL aportado en el registro. Otras supresiones requieren operaciones revisadas; se rechazan hasta entonces.

La operación es idempotente; una segunda pasada comprueba que el conjunto ya está ausente. Todas las entradas se aplican en una única transacción serializable; un conflicto revierte el conjunto completo. El recibo se genera tras commit y no incluye nombres, teléfonos, credenciales ni contenido de registros.

## Componentes

- Validador/replay Node con `pg`, consultas parametrizadas e inspección de referencias. CLI con URL explícita limitada a bases de restauración en loopback; no usa `DATABASE_URL`.
- Hook obligatorio del script de restauración: archivo y hash externos, helper montado de solo lectura, imagen backend local con Node/pg, contenedor efímero en el espacio de red del PostgreSQL aislado. El helper no recibe el archivo de entorno de la aplicación.
- Ninguna ruta HTTP ni tarea programada nueva. No se habilita el acceso de aplicación a la base restaurada.

## Validación

Registro vacío expresamente aprobado; registro alterado, vencido, no soportado o incompleto; IDs con alcance equivocado; rollback total al encontrar historia protegida; replay real tras `pg_dump`/`pg_restore`; segunda pasada idempotente; CLI independiente; aislamiento y huellas de otros negocios. Prueba adicional del script shell con respaldo age y una base exclusivamente ficticia, si las herramientas locales existentes permiten ejecutarlo.

## Límites

La autenticidad/frescura de la referencia externa y la autorización de cada decisión siguen siendo responsabilidades operativas. Un hash guardado junto a un archivo manipulable no basta. El registro debe estar custodiado y publicado por el proceso de privacidad, fuera de los respaldos que restaura; sus identificadores se restringen y conservan solo por esa finalidad. No se automatiza la aprobación jurídica, la custodia externa ni la supresión de historial financiero.
