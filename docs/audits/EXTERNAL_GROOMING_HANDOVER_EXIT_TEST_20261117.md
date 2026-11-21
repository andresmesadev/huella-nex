# Ensayo de exportación y salida asistida — 17/11/2026

**Resultado final: 24 comprobaciones de integración aprobadas, 0 fallos; 5 pruebas del exportador aprobadas.** Entorno local desechable con PostgreSQL y Chrome. No se conectó a producción ni se consultaron o modificaron datos reales de Mateos Pet. No se enviaron archivos a terceros.

## Reproducción y evidencia

- `node --test scripts/tenant-handover.test.cjs`.
- `node scripts/verify-onboarding-local.cjs --support-lifecycle`, con Playwright disponible en `NODE_PATH`.
- Registro final: `.cache/support-lifecycle-20261117-final.log`.
- Caso sintético y su hash: `.cache/support-lifecycle/support-case.json` y `support-case.sha256`.
- El evento `grooming-handover-and-exit` del caso identifica el paquete exacto. Contiene `data.json`, `manifest.json` y `SHA256SUMS`, en una carpeta exclusiva bajo `.cache/tenant-handovers/`; no se versiona el contenido.
- Paquete final de peluquería: 43 grupos revisados, 28 filas efectivas y tres archivos verificados. Las comprobaciones incluyen grupos vacíos; no son 43 tablas con filas.
- Se retiró el contenedor temporal y se comprobó que no quedan contenedores `onboarding-check-*`. Las copias ficticias se conservan para poder revisar la evidencia.

## Resultados comprobados

| Caso | Resultado |
| --- | --- |
| Contrato y esquema del exportador | El esquema actual pasa la revisión. Modelos o campos nuevos no revisados detienen la exportación. |
| Identidad del establecimiento | Un paquete contiene solo su establecimiento. Se comprobaron relaciones directas e indirectas con clientes, mascotas, transacciones e hijos. |
| Datos de otro negocio | Señuelos ajenos excluidos. Una referencia de staff ajena es rechazada por PostgreSQL; la asignación y el exportador posterior siguen intactos. La validación propia del exportador también se prueba por separado. |
| Credenciales y secretos | Excluidos hashes de contraseña, claves de API, datos de sesión y referencias secretas de facturación usadas como señuelos. |
| Lectura de origen | Transacción consistente de solo lectura. Cierres y stock se contrastan antes y después de exportar. |
| CLI real | Conexión explícita a la base temporal; caso y canal simulado obligatorios. La ausencia de argumentos se rechaza sin cargar una conexión de producción por omisión. |
| Apertura e integridad | JSON abierto y comparado con el contenido preparado. Manifiesto y hashes comprobados. Alterar una copia produce rechazo; restaurar la copia original vuelve a validar. |
| Destino | Rechaza una carpeta pública y una entrega ya existente; no sobrescribe una copia silenciosamente. |
| Recuperación de administrador | Restablecimiento aislado; contraseña y sesión anteriores rechazadas; rol y pertenencia conservados, cuenta ajena intacta. La verificación humana de identidad se simuló expresamente. |
| Salida de la peluquería | Exportación reconciliada, revocación por la ruta autenticada existente, sesión anterior HTTP 403 y nuevo inicio de sesión rechazado. Cero accesos activos del negocio ficticio, cuyo único usuario con credencial era el administrador. |
| Conservación al salir | El establecimiento y sus datos operativos permanecen. Los registros exportados antes y después de revocar son iguales. Otro negocio mantiene acceso HTTP 200. |

## Conciliación de la peluquería ficticia

- Dos cobros: **$140.000** en total.
- Un cobro combinado de **$100.000**, con $50.000 en efectivo y $50.000 por transferencia; otro cobro de $40.000 en efectivo.
- Gasto registrado: **$5.000**. Saldo de movimientos del cierre: **$135.000**.
- Comisiones activas: **$43.000**; se conservan el reparto histórico 30/70 y el posterior 40/60, sin reescribir el primero.
- Saldo después de reservar comisiones: **$92.000**, calculado sobre los registros exportados.
- Stock y cierres permanecen iguales después de la exportación y de la revocación de acceso.

## Ajustes del verificador

El ensayo histórico trataba de insertar una referencia cross-tenant para que el exportador la rechazara después. La restricción de PostgreSQL ahora impide esa inserción. Se ajustó el verificador para exigir el rechazo de la base y comprobar que no cambia la fuente; no se deshabilitó ninguna protección.

Se añadió el escenario específico de entrega y cierre de acceso de peluquería. Durante su preparación se corrigieron las expectativas del verificador: la revocación responde HTTP 204 y una sesión anónima puede ser `null`. La ejecución final incluye esas comprobaciones y pasó completa. Solo cambió el verificador; no se modificó código del producto ni se desplegó una versión nueva.

## Límites y pendientes de una salida real

Esto acredita preparación del paquete operativo y cierre de accesos en el escenario ensayado. No constituye aceptación de la peluquería externa, entrega a una persona real ni verificación real de su identidad.

El paquete conserva las exclusiones declaradas en su manifiesto: credenciales, procesamiento técnico y eventos de dominio, entre otros; no es un respaldo restaurable completo. Si el alcance solicitado incluye auditorías guardadas como eventos o archivos externos, hay que revisarlos y preparar su complemento. No se declara una entrega íntegra de todos los soportes o historiales por este ensayo.

El exportador escribe JSON local sin cifrar ni enviar automáticamente. El cifrado o medio protegido, destinatario, recepción y apertura por el cliente deben ejecutarse y comprobarse cuando exista una solicitud legítima. Este trabajo no prueba una entrega remota protegida.

La revocación de credenciales no elimina el establecimiento ni sus datos. No se realizó ni se declara validada una supresión o anonimización, eliminación de copias históricas ni desconexión de proveedores. Esos alcances y plazos deben concretarse en las condiciones antes de datos reales.

La prueba cubre un administrador activo de la peluquería. Antes de una salida real debe inventariarse y revocarse cada cuenta, sesión y canal aplicable, comprobando sus permisos y la facultad del solicitante. Las trazas de acceso se conservan conforme al acuerdo y las obligaciones aplicables.

## Estado de los tres pasos de incorporación

1. Publicación: 3.3.1 fue verificada en el despliegue anterior; no se alteró en este ensayo.
2. Condiciones: plantillas preparadas, aún sin completar ni aceptar por el negocio.
3. Aceptación práctica externa: pendiente de aprobación y participación de la peluquería. Las pruebas sintéticas no la sustituyen.
