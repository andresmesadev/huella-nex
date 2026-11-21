# Ensayo de entrega protegida y supresión — 17/11/2026

**Resultado: 28 comprobaciones de integración aprobadas, 0 fallos.** Incluye el recorrido previo de exportación y cierre de acceso, más cuatro comprobaciones amplias de entrega, supresión, restauración y retirada de copias. Todos los registros son ficticios; no se accedió a producción ni a datos reales de Mateos Pet.

## Ejecución y evidencia

- Comando: `node scripts/verify-onboarding-local.cjs --protected-exit-drill`, con el Playwright existente disponible mediante `NODE_PATH`.
- Verificador nuevo: `scripts/verify-protected-handover-erasure.cjs`. Es un ensayo sin interfaz CLI de eliminación, no una herramienta de producción.
- Exige la base `onboarding_test` en loopback y el contenedor temporal de esta ejecución, cuyo identificador y etiqueta generada por el harness se comprueban. La supresión se limita a identificadores ficticios generados por esa invocación.
- Registro final: `.cache/protected-exit-drill-20261117.log`.
- Evidencia estructurada: `.cache/support-lifecycle/protected-delivery-erasure.json`.
- Se conservan metadatos del resultado y un registro sintético mínimo de supresión bajo `.cache/tenant-handovers/protected-drill-*`. No se conservan allí las claves ni los archivos de entrega o respaldo del ensayo.
- El contenedor temporal fue retirado; se comprobó que no quedan contenedores `onboarding-check-*` de las pruebas.

## Entrega protegida

| Comprobación | Resultado |
| --- | --- |
| Paquete | Tres archivos operativos, agrupados para la entrega: datos, manifiesto y sumas de integridad |
| Cifrado del archivo | CMS con AES-256-GCM, utilizando OpenSSL 3.5.6 instalado; vinculado al certificado del destinatario ficticio |
| Clave ajena y alteración | El descifrado falla con una clave privada distinta y al alterar el archivo cifrado |
| Transporte | Servidor HTTPS local ligado a 127.0.0.1; el cliente valida el certificado de prueba confiándolo expresamente, sin desactivar la verificación TLS |
| Certificado no confiado | Conexión rechazada |
| Descarga sin autorización | HTTP 401 |
| Descarga autorizada | HTTP 200; bytes y hash coinciden con el archivo cifrado del emisor |
| Reutilización y caducidad | HTTP 410; no se permite una segunda descarga ni usar el acceso caducado |
| Apertura | El destinatario ficticio descifra, abre los JSON y verifica las sumas; los registros coinciden con el paquete preparado |

El destinatario, autorización y certificado son exclusivamente sintéticos. No se contactó a una persona ni se verificó una identidad real. Este servidor local y su certificado de un día no se ofrecen como servicio público de entrega; prueban el recorrido criptográfico y de acceso del ensayo.

## Supresión limitada y comprobada

Se creó un establecimiento adicional de prueba con un cliente, mascota, miembro del equipo y credencial ya inactiva. El paquete no expone la credencial. No tiene citas, cobros, comisiones, cierres, eventos de dominio ni historias clínicas que exijan revisar conservación.

El verificador vuelve a comprobar esa ausencia antes de eliminar nada. En una transacción serializable elimina exactamente los registros de esta invocación y verifica su ausencia posterior, incluida la credencial. Una exportación posterior del establecimiento devuelve `HANDOVER_TENANT_NOT_FOUND`.

Las huellas de los registros exportables de los tres negocios anteriores permanecen iguales. Se comprobó además que el intento de borrar una comisión de la peluquería ficticia con actividad financiera sigue siendo rechazado por PostgreSQL. No se desactivaron restricciones ni se borró su historial para hacer pasar el ensayo.

Este resultado acredita una supresión elegible y acotada. **No acredita el borrado integral de una peluquería con actividad financiera o historial inmutable**, ni determina qué conservación jurídica corresponde a un negocio real. Esa evaluación sigue siendo por categoría y por caso.

## Copia anterior y restauración

1. Se hizo un `pg_dump` real de la base completamente ficticia antes de la supresión. El volcado se cifró antes de escribirlo a disco; no se creó un archivo de volcado en claro.
2. Se eliminó el conjunto elegible en la base fuente.
3. Se descifró el respaldo por memoria y se restauró con `pg_restore --exit-on-error` en una segunda base temporal del mismo contenedor, sin publicar otro puerto ni conectarla al dashboard.
4. La copia antigua volvió a contener los datos ficticios suprimidos. Su credencial permaneció inactiva. Este resultado evidencia que borrar la fuente no borra las copias anteriores.
5. Se leyó el registro de supresión mantenido fuera de ese respaldo y se reaplicó la eliminación exacta antes de habilitar cualquier uso de la base restaurada. Los registros desaparecieron y las huellas de los otros negocios siguieron iguales.

Este replay es una actuación explícita del ensayo, **no una integración automática ya instalada en la recuperación de producción**. Una restauración real requiere comprobar las decisiones posteriores al respaldo y aplicarlas antes de reabrir el servicio.

## Retirada de copias y límites

Se eliminaron y se comprobó la ausencia de los archivos claros del emisor y receptor, archivo cifrado de entrega, respaldo cifrado y archivos de claves/certificados creados para el ensayo. Las eliminaciones de archivos se limitaron a rutas resueltas y verificadas bajo la carpeta privada de esta ejecución; no hubo borrado recursivo global.

Se conservan el registro sintético de supresión, las huellas y el resultado, sin el contenido del paquete ni las claves. Los buffers sensibles controlados por el verificador se limpian antes de terminar. El proceso y las bases temporales concluyen al finalizar.

Esto acredita retirada lógica de registros y archivos. No demuestra borrado forense del almacenamiento físico, memoria del sistema o instantáneas ajenas al ensayo. No se probó eliminación ni caducidad de respaldos reales en R2, de soportes en proveedores, de copias de un destinatario externo o de los archivos ficticios de ejecuciones anteriores.

## Consecuencias para las condiciones del participante

- La entrega protegida y la supresión elegible tienen un recorrido sintético comprobado.
- Antes de datos reales hay que acordar destinatario y canal verificados, plazos de entrega y conservación, tratamiento de copias residuales y registros que deban mantenerse.
- La supresión no debe confundirse con cerrar acceso ni con eliminar el historial financiero protegido.
- El registro de decisiones de supresión debe conservarse de forma segura e independiente de los respaldos que puedan ser restaurados; debe revisarse antes de reabrir una restauración real.
- La aprobación del negocio y su aceptación práctica siguen pendientes. No se enviaron condiciones, se crearon cuentas reales ni se desplegaron estos verificadores.
