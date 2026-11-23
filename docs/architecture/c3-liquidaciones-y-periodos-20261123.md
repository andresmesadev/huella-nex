# C3 — Liquidaciones, comisiones y períodos financieros en el dashboard

**Fecha:** 23/11/2026 · **Origen:** hallazgo C3 de la [revisión multiagente](../audits/REVISION_MULTIAGENTE_UI_PRODUCTO_20261121.md) · **Decisión de alcance:** Andrés, 23/11/2026.

## Problema

El backend ya expone tres capacidades sin pantalla:

| Capacidad | Ruta |
|---|---|
| Generar y listar liquidaciones | `POST/GET /settlements` (Staff, Entregable Puente) |
| Anular una comisión con reemplazo | `POST /commissions/:id/void` (ADR 009) |
| Generar y consultar períodos financieros | `POST/GET /financial-periods` (Finanzas 2.3) |

Hoy el administrador ve en Caja cuánto se reservó para comisiones, pero no puede liquidar a un profesional, corregir a quién se le asignó una comisión ni cerrar un período.

## Alcance

Es una exposición de casos de uso existentes, al estilo del Entregable Puente. No agrega reglas de negocio ni entidades nuevas.

1. **Consultar comisiones** por profesional y rango de fechas: servicio, mascota, fecha, precio, parte del profesional, estado y si ya está liquidada. Agrega **una lectura nueva**: `GET /commissions` mediante un caso de uso del contexto Staff (`listCommissions`), nunca consultando el repositorio desde la ruta.
2. **Corregir la asignación de una comisión.** Decisión del responsable: solo dos operaciones, ambas sin cambiar el precio.
   - Reasignarla a otro profesional activo del establecimiento.
   - Anularla sin reemplazo, para una cita que nunca debió generar comisión.

   El precio se sigue corrigiendo **solo** por la corrección de conceptos del recibo (ADR 025), que mantiene juntos comisión y cobro. La ruta `POST /commissions/:id/void` **impone** esta decisión: si llega un reemplazo, el precio usado es el de la comisión original y cualquier `resolvedPrice` enviado se rechaza.
3. **Generar y listar liquidaciones** de un profesional para un rango de fechas. La confirmación aclara que una liquidación es un **estado de cuenta, no un pago**, y que hoy no se puede anular desde el dashboard.
4. **Generar y consultar períodos financieros.** Solo se puede cerrar un período cuyos días tengan todos su cierre oficial; la API responde 422 si no es así.

**Fuera de alcance:**
- Anular liquidaciones o períodos: no existe el comando.
- Cambiar precios de comisiones.
- Pagar al profesional.

## Reglas que se respetan

- **Aislamiento.** El `tenantId` sale solo de `req.tenant`. `listCommissions` rechaza un tenant nulo y verifica que el profesional pertenezca al establecimiento (patrón 6.3). El acceso sigue siendo solo de administración, porque el middleware ya restringe estas rutas a `administration`.
- **Fronteras del ADR 009, sin cambios.** No se puede anular una comisión de un día con cierre oficial ni una ya incluida en una liquidación activa. La UI muestra esas respuestas como mensajes claros.
- **Fechas civiles de Colombia.** Los rangos se envían como `AAAA-MM-DDT00:00:00-05:00`, con fin exclusivo (día siguiente), igual que los días civiles del ADR 008.
- **Acciones irreversibles.** Generar una liquidación o un período pide confirmación con `useActionConfirmation`. Los errores 409 (ya existe) y 422 (días sin cierre) se muestran tal cual los explica el backend.

## Ubicación

Nueva pestaña **«Comisiones y liquidaciones»** en Punto de venta, visible solo con `finance`. El proxy la bloquea en el servidor igual que Gastos, Historial y Reportes.

## Verificación

- **Pruebas de backend:**
  - aislamiento de `listCommissions`, que no muestra profesionales ni comisiones de otro establecimiento;
  - rechazo de `resolvedPrice` en la anulación;
  - reasignación con el mismo precio.
- **Pruebas de frontend:** lint y tipos.
- **Revisión en pantalla** en el dashboard local, en escritorio y celular.
