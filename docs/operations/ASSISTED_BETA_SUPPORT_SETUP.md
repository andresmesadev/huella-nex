# Soporte de la beta manual — preparación del 18/11/2026

Estado: procedimiento preparado, no oferta aceptada ni canal probado. Complementa HUELLA_NEX_SUPPORT_AND_EXIT_RUNBOOK.md. No cambia datos ni configura proveedores.

## Ficha operativa antes de invitar

| Campo | Situación |
| --- | --- |
| Responsable inicial | Andrés, según el runbook existente |
| Correo documentado | huellanex@nexoweb.co; recepción/respuesta real pendientes de comprobar |
| Días y franja America/Bogota | Pendiente de decisión; no prometer atención continua |
| Objetivo de primera respuesta dentro de franja | Pendiente de acuerdo; distinto del tiempo de solución |
| Alternativa fuera de franja y suplencia | Pendiente; si no hay suplente, declararlo y no prometer cobertura |
| Contacto acreditado del negocio | Pendiente de aprobación y correo de la dueña |
| Registro alternativo del negocio | Por acordar con la dueña antes de datos reales |

## Atención por impacto

- Posible acceso ajeno, exposición, pérdida o duplicación de dinero: detener el flujo afectado, preservar evidencia mínima y avisar al responsable por canal acreditado. No repetir cobros ni intentar arreglar historia con SQL. No esperar a reproducir con datos reales para contener el flujo. Las comunicaciones y obligaciones aplicables se revisan en el caso; este procedimiento no fija plazos jurídicos.
- Flujo esencial bloqueado sin indicio de pérdida: registrar caso y alternativa, reproducir con fixtures, resolver y comprobar antes de conciliar las operaciones pendientes.
- Consulta o mejora sin bloqueo: registrar solicitud y alcance, sin prometer fecha de desarrollo ni considerarla automáticamente incluida en el plan.

La prioridad no constituye un SLA. Registrar hora de recepción, hora de lectura y primera respuesta por separado; distinguir trabajo, espera y tiempo fuera de cobertura.

## Acuse listo para adaptar, no enviado

> Recibimos el caso [REFERENCIA] sobre [FUNCIÓN]. Su estado es [ESTADO] y lo atiende [RESPONSABLE]. [INDICACIÓN CONCRETA: consultar historial antes de repetir / continuar en registro alternativo / detener el flujo afectado]. El próximo contacto será [FECHA Y HORA ACORDADAS]. No envíes contraseñas ni códigos de acceso. Si no tenemos un plazo de solución confirmado, te informaremos del avance.

No afirmar recepción si solo se redactó el mensaje. No fijar el próximo contacto hasta comprobar disponibilidad. No incluir capturas completas ni datos de otros establecimientos.

## Prueba del canal, pendiente de un destinatario autorizado

1. Confirmar acceso al buzón y destinatario de prueba autorizado. La solicitud actual no autoriza mensajes a terceros; no enviar sin instrucción expresa.
2. Enviar un mensaje sin datos personales de clientes ni adjuntos, con asunto QA-HN-SOPORTE y referencia única. Registrar hora y canal de origen.
3. Comprobar recepción real, revisar spam y responder por el buzón de soporte.
4. Confirmar recepción de la respuesta en el origen y asociación con la misma referencia. No basta DNS, login del buzón o correo en Enviados.
5. Guardar evidencia mínima en expediente privado. Registrar fallo o pendiente si falta una de las dos direcciones del recorrido. No declarar el canal operativo por esta plantilla.

## Casos y cierre

Usar el modelo privado del runbook: referencia, tenant confirmado, solicitante/facultad, canal acreditado, impacto, alcance autorizado, acciones, evidencia, comprobación y cierre. Separar identidad pendiente de incidencia resuelta. Solo cerrar la recuperación de acceso tras comprobar sesión anterior inválida y permisos correctos. Una consulta de soporte no autoriza exportar, suprimir, cambiar cobros o asumir la cuenta del cliente.

Práctica con persona externa: ejecutar C7 del procedimiento de evaluación y pedirle que explique cómo reportar y continuar si falla el dashboard. Esta aceptación humana está pendiente; no se sustituye por un simulador.
