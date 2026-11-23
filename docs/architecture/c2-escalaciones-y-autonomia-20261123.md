# C2 — Escalaciones y límite de autonomía de los Empleados Digitales

**Fecha:** 23/11/2026 · **Origen:** hallazgo C2 de la [revisión multiagente](../audits/REVISION_MULTIAGENTE_UI_PRODUCTO_20261121.md) · **Decisión:** Andrés pidió construirla (23/11/2026).

## Problema

El contexto Empleados Digitales (`domain-model-v1.md` §9) ya tiene estas capacidades en `agents.routes.js`, pero ninguna pantalla las usa:

| Capacidad | Ruta |
|---|---|
| Pausar y reactivar empleados | `POST /digital-employees/:id/pause` · `/reactivate` |
| Configurar el límite de autonomía | `POST /digital-employees/:id/autonomy-limits` |
| Consultar y atender escalaciones | `GET /escalations/pending` · `POST /escalations/:id/attend` |

Desde el Entregable 5.3, un límite con `autoApproved: false` hace que el Coordinador de Agenda **no envíe** ese tipo de recordatorio y genere una escalación. Hoy nadie vería esa escalación: el texto de 5.3 decía que ya estaba en el dashboard, pero no lo está.

## Alcance

Es una exposición de casos de uso existentes, sin reglas de negocio ni entidades nuevas. Va en una sección nueva, solo para administración, dentro de **Asistentes**: «Supervisión de empleados digitales».

1. **Empleados:** nombre legible de cada especialización, estado y botón para pausar o reactivar.
2. **Escalaciones pendientes:** cada una muestra qué empleado la generó, cuándo y por qué. Se traduce el `context` de las tres fuentes reales:
   - Coordinador de Agenda: recordatorio bloqueado por el límite.
   - Recepcionista IA: conversación de WhatsApp que pide atención humana.
   - Asistentes operativos: solicitud que agotó sus reintentos.

   «Marcar como atendida» registra a la persona que la atiende. **No reenvía** el recordatorio ni responde al cliente, y la pantalla lo dice.
3. **Límite de autonomía del Coordinador de Agenda,** para los 5 tipos de recordatorio reales (`appointment`, `vaccine`, `deworming`, `grooming`, `follow_up`, de `jobs/reminder.job.js`). Cada tipo puede quedar en «Enviar automáticamente» o «Pedir revisión antes de enviar».
   - La pantalla explica el efecto: con revisión, ese recordatorio **no se envía** y aparece como escalación.
   - Sin configuración se envía, como hoy: la invariante de 5.3 de que la ausencia de configuración nunca bloquea.
   - Agrega **una lectura nueva**: `GET /digital-employees/:id/autonomy-limits`, a través de un caso de uso con verificación de establecimiento.

**Fuera de alcance:**
- Crear límites para otros empleados.
- Reenviar recordatorios escalados.
- Consultar tareas y decisiones: las rutas existen, pero no aportan a la operación diaria.

## Aislamiento, porque es la condición que define la pantalla

Hoy los casos de uso aceptan `tenantId = null` y, en ese caso, listan **todos** los establecimientos. Esto pasa con `listPending` y con `list` de empleados. Con la vista de superadmin de todos los negocios (6.6), `req.tenant.tenantId` llega nulo. Por eso:

- **Todas las rutas de `agents.routes.js` exigen un establecimiento** y responden 400 si `req.tenant.tenantId` es nulo. Ninguna de ellas forma parte de la vista centralizada de 6.6.
- **La escalación se atiende a nombre de quien ejecuta la acción** (`req.actor.staffId`, o nulo si es la cuenta de administración de la plataforma). Se ignora el `assignedStaffId` que llegue en el cuerpo, porque hoy no se valida contra el establecimiento.
- **La lectura nueva de límites** verifica que el empleado pertenezca al establecimiento, con el mismo patrón que `configureAutonomyLimit`.
- **El acceso sigue siendo solo de administración:** el middleware ya restringe estas rutas a `administration`, y la sección solo se muestra con esa capacidad.

## Error encontrado al probar: filtro de plataforma demasiado amplio

`events.routes.js` (3.0.1, 08/11/2026) protegía las escrituras de eventos globales con un `router.use` sin ruta. Como ese router se monta sin prefijo, el filtro respondía 403 a **toda** escritura de un administrador de establecimiento que pasara por él, incluidas las de agentes, automatizaciones y **excepciones de agenda**.

- **Ahora** el filtro solo aplica a `/event-types` y `/domain-events`.
- **El registro de plantillas de automatización** (`POST /automation-templates`) crea plantillas del catálogo global, sin establecimiento. Queda reservado a la plataforma con su propio filtro explícito.
- **Las pruebas** cubren ambas cosas: las escrituras de otros routers ya no se bloquean, y un administrador de establecimiento recibe 403 al registrar una plantilla global.

## Verificación

- **Pruebas de backend:**
  - 400 sin establecimiento en las rutas de agentes;
  - la escalación se atiende con el actor y no con el cuerpo;
  - los límites no se leen de un empleado de otro establecimiento.
- **Pruebas de frontend:** lint y tipos.
- **Revisión en pantalla** con datos de prueba en el negocio ficticio local.
