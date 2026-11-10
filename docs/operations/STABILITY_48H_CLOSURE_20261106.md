# Cierre de estabilidad de 48 horas — Huella Nex 3.0.0

**Revisión:** 06/11/2026, 11:33–11:38 Colombia, mediante SSH con la identidad
existente y verificación estricta de la huella del servidor. Solo lecturas;
sin reiniciar la aplicación, el host o el observador, cambiar datos ni iniciar
otra ventana. El contenedor temporal de análisis no tuvo red, credenciales ni
acceso de escritura a la evidencia.

## Resultado y alcance del cierre

Se cierra el **ítem 9 de estabilización y BETA-03 para el dashboard manual de
3.0.0**: la ventana finita de salud aprobó 48 horas continuas de la misma
versión. Se contrastaron actividad real, logs conservados, colas y consultas
autenticadas actuales. Este cierre no declara disponibilidad absoluta entre
sondeos, ausencia de cualquier error HTTP, capacidad máxima, beta externa
abierta ni entrega de WhatsApp/IA comercial.

## Evidencia de la ventana

Archivo original, preservado en la VPS:
`/var/lib/mateos-pet-ai/stability/ventana-3.0.0-20261030T233255Z.jsonl`.

| Criterio | Resultado |
| --- | --- |
| Inicio Colombia | 30/10/2026, 18:32:56.603 |
| Fin Colombia | 01/11/2026, 18:32:56.700 |
| Cobertura | 48,000026944 horas |
| Muestras | 577; todas HTTP 200, `ok: true` |
| Muestras fallidas | 0 |
| Huecos mayores de 330 segundos | 0; intervalo máximo 300,101 segundos |
| Versiones | Exclusivamente 3.0.0; sin versión inesperada |
| Reinicio de worker registrado | No; worker pausado durante toda la ventana |
| Fallo de worker registrado | No |
| Latencia de salud | p95 observado 1.374 ms; máximo 2.051 ms |
| Veredicto oficial | `health_window_passed`; salida 0 |
| SHA-256 del JSONL | `1d783ce570f0b46777986e24cb57cbac0f9cba87377395d7f86fd5398f1d17ff` |
| SHA-256 del observador | `7dec655ef4d345c56737a96b1d24f1f04df55ab2857f696f75b7bb6e73c10a87` |

La huella del observador instalado coincide con la fuente local normalizada a
LF. Se ejecutó su analizador original, sin modificar criterios:

```text
--summarize /workspace/.cache/stability/ventana-3.0.0-20261030T233255Z.jsonl
--hours 48 --interval-seconds 300 --expected-version 3.0.0
verdict=health_window_passed samples=577 failedSamples=0 gaps=0
restarts=false recordedWorkerFailure=false unexpectedVersion=false
exit=0
```

La primera invocación de lectura usó UID 1000 y no pudo acceder al archivo.
Se corrigió a la identidad operativa existente, UID/GID 1001, y el analizador
aprobó. No se cambiaron permisos ni propietario: directorio 0700 y archivo
0600. El error de lectura del ensayo no fue una muestra fallida del sistema.

## Contraste operacional y estado actual

- Backend y frontend mantienen las imágenes publicadas y sus inicios del
  30/10 a las 23:32:37/38 UTC; ambos con `RestartCount=0`. El repositorio de la
  VPS conserva `93e5d8b` (documentación), sobre el código publicado `edae4d3`.
- Salud pública del 06/11, 11:33:58 Colombia: HTTP 200, versión 3.0.0, base y
  OpenAI `ok`, worker `paused` y saludable.
- Cinco consultas autenticadas actuales HTTP 200: permisos, agenda de hoy,
  inventario, catálogo de caja y estado de servicios. Se utilizaron credenciales
  existentes en memoria; no se imprimieron secretos ni datos de clientes.
- Para el establecimiento operativo, hay **10 citas con fecha dentro de la
  ventana y 10 cobros activos con `paidAt` dentro de ella**. Son conteos de
  actividad, no una nueva conciliación contable ni prueba de simultaneidad.
- Consulta actual agregada: cero `InboundJob`; 376 entregas de eventos, todas
  `delivered`, sin pendientes/fallidas. Es una captura actual, no una serie
  histórica de profundidad de cola. WhatsApp permanece pausado.
- La unidad finita del observador está `inactive/dead`, `Result=success`,
  `ExecMainStatus=0`: terminó su trabajo. No debe reiniciarse por aparecer
  inactiva. La observación no cubre continuamente del 01/11 al 06/11.

## Logs e incidencias conservadas

Se analizaron los logs disponibles de los contenedores para las fechas exactas
de la ventana, sin publicar IP, identidad, conversaciones o datos clínicos.
No se encontraron firmas de OOM, excepciones no capturadas, fallos de conexión
a BD ni fallos de salud OpenAI en ese conjunto. Esto no acredita exhaustividad
de todos los registros históricos ni ausencia absoluta de fallos.

**Backend:** 71 mensajes de error CORS por origen `bot.nexoweb.co` entre el
31/10 a las 17:25:05 y 17:26:12 Colombia. Nginx conserva en esos dos minutos
71 respuestas 500 y, entre sus rutas, `POST /index.php`, `POST /` y variantes
`/wp-json/batch/v1`. Es un patrón compatible con sondeos automatizados a PHP/
WordPress; es una inferencia, no identificación demostrada del remitente.
También constan respuestas 200 de acceso al dashboard en ese intervalo.
El rechazo CORS permaneció activo y no se cambió su política para pasar la
prueba. Se conserva como seguimiento la clasificación/ruido del rechazo
(hoy 500); este documento no lo presenta como corregido.

**Frontend:** un `Error: aborted`, código `ECONNRESET`, el 31/10 a las
11:22:33 Colombia. No causó reinicio ni fallo de muestra de salud. El log
retenido no basta para atribuir el corte a un cliente o componente concreto.
Se conserva el hecho, sin afirmar que todas las peticiones fueron exitosas.

Estos registros impiden describir el período como «cero errores en todos los
logs», pero no incumplen el criterio registrado de 577 sondeos sanos sin huecos
y de la misma versión. No se eliminaron muestras ni se sumaron ventanas.
Los fallos de 2.58.2 y versiones anteriores siguen preservados como historia.

## Lo que sigue abierto

La recuperación ante pérdida total de VPS (**BETA-02**) continúa pendiente de
copia externa cifrada y ensayo desde ese destino. La conexión autorizada de
Cloudflare por sí sola no prueba que el respaldo exista. El presente cierre
tampoco activa WhatsApp, aprueba Meta ni admite automáticamente un negocio
externo: conserva los demás criterios de
[preparación de beta externa](../audits/HUELLA_NEX_EXTERNAL_BETA_READINESS_20261030.md).

Fuentes: [observación finita](PERSISTENT_STABILITY_OBSERVATION.md),
[historia de estabilidad](REAL_OPERATION_STABILITY_REVIEW_20261022.md),
[publicación 3.0.0](../history/RELEASE_3_0_0_20261030.md).
