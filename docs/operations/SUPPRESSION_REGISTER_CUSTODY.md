# Custodia del registro de supresiones — preparación del 18/11/2026

Estado: diseño operativo pendiente de medios y responsables confirmados. No se creó un registro real, no se declararon cero supresiones y no se activó recuperación en producción. Complementa RESTORE_SUPPRESSION_REPLAY.md.

## Responsabilidades a completar en privado

- Responsable de decidir alcance/conservación y acreditar la solicitud: por confirmar para la operación real.
- Custodio del registro y sus revisiones: por designar; no se atribuye este rol automáticamente a la peluquería ni a Mateos Pet.
- Operador que restaura: persona acreditada, con copia de trabajo de solo lectura y acceso temporal.
- Suplencia y recuperación de acceso: por designar. Si Andrés ocupa varios roles inicialmente, documentar esa concentración; no afirmar separación de personas inexistente.

## Tres elementos que no deben confundirse

A. Registro completo versionado: medio privado cifrado, acceso por cuentas nominativas, MFA si está disponible, historial de versiones y acceso limitado al custodio. Fuera del conjunto de respaldos de la aplicación y de Git. Identificadores mínimos; la evidencia de identidad y aprobación se conserva en expediente privado por caso, no como campos nuevos del JSON.

B. Referencia vigente de confianza: conservar por un medio separado del archivo y con control de modificación independiente. Incluir registerId, revision, SHA-256 exacto, emisión, vencimiento y referencia de aprobación. No guardar como única prueba un SHA256SUMS editable junto al registro. Un directorio distinto en el mismo equipo no acredita independencia de acceso o protección frente a pérdida del equipo.

C. Material de recuperación y claves: cuenta o medio de recuperación custodiado fuera del servidor que se restaura. No incluir claves de descifrado junto al respaldo ni en los logs. Elegir soporte y ubicaciones concretas antes de dar por disponible la recuperación; no se configuró aquí ningún proveedor.

El hash aporta integridad respecto de la referencia; no autentica al aprobador ni demuestra actualidad. El validador admite cualquier revisión formalmente válida y vigente: NO detecta por sí solo que exista una revisión posterior. El operador compara la revisión y huella contra B antes de ejecutar. Si B falta, hay duda o discrepa, detenerse.

## Publicar una revisión aprobada

1. Verificar identidad/facultad, alcance y conservación del caso; no eliminar historial financiero para que el replay pase. Conservar fundamento e instrucciones privadas.
2. Reconciliar el registro completo con las decisiones aplicables y pendientes. No sacar entradas porque el dato ya no exista en la base actual: una copia antigua puede recuperarlo. No retirar una entrada sin justificar que ninguna copia conservada/reutilizable puede reintroducirla y resolver las obligaciones de conservación pertinentes.
3. Revisar operaciones soportadas. Una operación todavía no implementada queda bloqueada y documentada; no omitirla para declarar completo el registro que se usará con una copia afectada.
4. Emitir revisión creciente, nueva issuedAt y validUntil de máximo 24 horas; complete:true solo tras revisión efectiva. Una revisión vacía exige igual comprobación. No generar un registro vacío desde una copia de seguridad ni inferirlo de un archivo ausente.
5. Validar formato y huella sobre los bytes finales. Guardar la revisión como nueva, sin sobrescribir la anterior. Identificar expediente y aprobador en la evidencia privada, no modificando el esquema cerrado del helper.
6. Actualizar B solo después de publicar A y comprobar lectura/huella. Confirmar coincidencia entre ambos antes de admitir uso. Si se interrumpe el paso, mantener estado pendiente; nunca usar la revisión inferior para resolver una discrepancia.

La vigencia de 24 horas es la del snapshot usado para restaurar; no es la conservación de las decisiones. Renovar un snapshot exige confirmar completitud, no cambiar fechas mecánicamente.

## Restaurar sin reintroducir datos

Obtener A y B por sus medios acreditados y comprobar registerId, revisión exacta, huella y vigencia. Registrar quién lo comprobó y cuándo. Usar el procedimiento aislado con journal/hash explícitos, exigir replay verified:true y el resto de controles de restauración. No abrir el dashboard si falla o hay una decisión no cubierta. Conservar recibo mínimo y evidencias privadas; retirar las copias de trabajo según el caso.

Ante pérdida de B, credencial comprometida, copia antigua, revisión ausente o discrepancia: detener habilitación, recuperar mediante custodia/suplencia acreditadas, reconciliar y emitir revisión apropiada. No recalcular el hash del archivo encontrado y tratarlo como fuente confiable. La bitácora manual no es inmutable ni una firma digital.

## Prueba de custodia antes de adopción real

- Acreditar lectura autorizada del registro y denegación a una cuenta que no deba leerlo.
- Acreditar que cambiar A no permite alterar B con la misma autoridad indebida y comprobar revisión vigente.
- Simular indisponibilidad del servidor y recuperación del registro, referencia y claves desde sus medios independientes, sin traer datos reales al laboratorio.
- Comprobar que el suplente autorizado puede operar, o documentar la indisponibilidad hasta que vuelva el único custodio.
- Revisar conservación y eliminación de copias de trabajo. No declarar borrado físico irreversible por borrar archivos.

Estos controles sobre cuentas/proveedores REALES están pendientes. El ensayo sintético reproduce separación lógica, integridad, vencimiento y discrepancias; no prueba ACL, MFA, suplencia o recuperación de medios externos.
