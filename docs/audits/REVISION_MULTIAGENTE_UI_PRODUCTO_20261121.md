# Revisión multiagente: interfaz visual y oferta del producto

**Fecha:** 21/11/2026 · **Tipo:** revisión de solo lectura (no se modificó código)
**Método:** tres agentes en paralelo (diseño y componentes, oferta del producto, coherencia UI↔backend), más una pasada visual en vivo de las páginas públicas y verificación manual de los hallazgos principales contra el código.

## Alcance y cobertura

| Qué | Cómo se revisó |
|---|---|
| Landing, login y onboarding | **Renderizado en navegador** (móvil 375 px y escritorio) |
| Páginas legales | Renderizado: devuelven 404 en local por falta de variables `HUELLA_NEX_LEGAL_*`. Es intencional (`lib/public-legal-identity.ts`), pero hay que confirmar que producción las tenga |
| Dashboard (25 páginas) | **Solo lectura de código, sin renderizar**: no había base de datos ni backend levantados |
| Lint y tipos del frontend | `npm run lint` → código de salida 0, sin advertencias. `npx tsc --noEmit` → código de salida 0, sin errores |

Las etiquetas **[nuevo]** y **[conocido]** indican si el hallazgo ya figura en `ESTADO_ACTUAL.md`, en el readiness del 30/10 o en las auditorías de 2026-11.

## Resumen ejecutivo

- **Sólido:**
  - Los permisos se aplican en el servidor desde un solo manifiesto por rol y módulo.
  - No hay endpoints rotos: 189 rutas cruzadas contra las llamadas del frontend.
  - La regla de `apiUrl` en componentes cliente se cumple.
  - Los formularios tienen buena accesibilidad y las confirmaciones destructivas son seguras.
  - La landing es honesta: no promete sedes, API, servicio ilimitado ni factura electrónica.
  - En la prueba en vivo no hubo desbordes en móvil ni errores de consola.
- **Lo más importante a corregir:**
  1. Inventario quedó condicionado a Pet shop, en contra del diseño aprobado.
  2. Plan y facturación no se alcanza desde ningún enlace.
  3. El mensaje comercial se contradice: beta cerrada frente a registro abierto con botón de pago.
  4. Las páginas legales no están enlazadas.
  5. Hay un modal del cierre del día sin accesibilidad.

---

## 1. Oferta del producto

### Alta

**P1. Inventario solo aparece con Pet shop, aunque el diseño dice lo contrario. [nuevo]**
- `backend/src/services/dashboard-access.service.js:36`: `if (capabilities.retail && capabilities.inventory_read)`. Entró en el commit 86f9247 del 18/11.
- `frontend/components/dashboard/inventory/inventory-workspace.tsx:120`: «Inventario está disponible cuando Pet Shop está activo».
- Contradice `docs/architecture/inventory-workspace.md:63`: «Inventario puede utilizarse en Veterinaria o Peluquería sin activar Pet shop, para controlar insumos».
- Una veterinaria o peluquería sin Pet shop sigue viendo «registrar insumos» (`ConsumptionButton` en `vet-record-sheet.tsx:428` y `grooming-notes-dialog.tsx:96`), pero no tiene dónde crear productos.
- El backend sigue permitiendo el inventario, así que el bloqueo es solo visual.
- Si la restricción se hizo a propósito para la beta, falta documentarla. Si no, es una regresión.

**P2. Plan y facturación no se alcanza desde la interfaz. [nuevo]**
- Ningún enlace lleva a `/dashboard/billing`. Solo se llega por URL o por la redirección automática cuando el negocio está suspendido (`dashboard-access-provider.tsx:40`).
- Sin embargo, `onboarding/page.tsx:168` promete «Podrás revisar y contratar un plan desde Facturación».
- La página se muestra sin menú lateral y su logo lleva a la landing (`dashboard-frame.tsx:34-37`).

**P3. El recorrido comercial se contradice. [nuevo; relacionado con BETA-04 y BETA-05]**
- La landing dice «Beta cerrada con acompañamiento».
- El login ofrece «Crear mi cuenta», un registro abierto (`login-form.tsx:97`).
- Facturación muestra «Actualizar» con checkout para Básico y Pro (`billing-view.tsx:160-166`).

**P4. Las páginas legales no están enlazadas. [nuevo en la interfaz]**
- La landing, el login y el onboarding no enlazan a `/privacidad` ni a `/terminos`. El grep no encontró ningún enlace fuera de `(legal)`.
- El registro no pide aceptar las condiciones.
- La adecuación legal la decide el responsable del proyecto.

### Media

- **P5. WhatsApp está visible para todos aunque el canal no esté conectado.** La bandeja dice «Tu bandeja está lista…» y no lleva a Integraciones (`whatsapp-web-view.tsx:118`). [parcialmente conocido]
- **P6. Planes Básico y Pro idénticos, con botón de pago activo.** «Cupo de IA por confirmar» aparece con check de incluido (`billing-view.tsx:24-58`). [conocido; el check es nuevo]
- **P7. Asistentes: el modo de texto libre consume cupo de IA sin avisarlo** (`interpreter.js:20`). Además muestra jerga interna: «Empleado» seguido de `id.slice(-6)`, «equipo digital». [nuevo]
- **P8. Facturación tiene salidas sin destino.** «Contactar soporte para bajar de plan» está deshabilitado y no da correo, y Personalizado dice «Consulta con el equipo» sin enlace (`billing-view.tsx:153-157`). [nuevo]
- **P9. Reportes queda escondido dentro de «Punto de venta».** El menú no tiene una entrada de Reportes, aunque la landing promete «Caja y reportes». [nuevo]
- **P10. Seguimiento de clientes desigual según el negocio.** «Clientes por contactar» solo existe con Peluquería, y un negocio solo Pet shop ve una vista vacía. [nuevo]
- **P11. Capacidad y última recepción en peluquería sin aplicar.** [conocido, GROOMING_20_90]
  - **Estado: diferido (decisión del responsable, 2026-11-23).** Es una regla de operación, no un defecto. No se construye hasta que el negocio defina: (a) si un peluquero puede atender más de una mascota a la vez y (b) la hora límite de recepción respecto al cierre. Mientras tanto, la recepción evita los cruces manualmente.

### Baja

- El onboarding marca Veterinaria por defecto (`onboarding/page.tsx:28`).
- La landing no menciona la historia clínica, que es la capacidad diferencial para veterinarias.
- Nombres inconsistentes entre las migas de pan y los títulos («Clientes» frente a «Clientes y mascotas», «Tenants», «Análisis de churn», «Pet Shop» frente a «Pet shop»).
- Errata en `clients-table.tsx:151`: «Eliminar al cliente "…"? Esta accion…» (faltan «¿» y la tilde).
- Al pulsar «Solicitar demostración» se abre el cliente de correo (`mailto`). En celulares sin correo configurado esto puede no hacer nada.

---

## 2. Componentes visuales y sistema de diseño

### Alta

**D1. El «Resumen del día» es un modal hecho a mano, sin accesibilidad. [nuevo]**
- Está en `daily-close-sheet.tsx:91-96`: un `div fixed` sin `role="dialog"`, sin trampa de foco y sin cierre con Escape.
- Las advertencias usan `text-amber-500`, con un contraste aproximado de 2,1:1.
- Muestra los mismos datos que `pos/daily-close-panel.tsx`, que sí usa `Dialog` de Radix. Existen dos versiones del cierre con diseños distintos.

**D2. El selector de especie cambia según el flujo. [nuevo]**
| Archivo | Opciones |
|---|---|
| `add-pet-to-owner-flow.tsx:178` | Perro, Gato y Otro |
| `new-owner-pets-sheet.tsx:203-207` | Perro, Gato, Ave, Conejo y Otro |
| `new-pet-sheet.tsx` | Botones con emoji y una etiqueta «Especie» sin asociar |

### Media

- **D3. Toast** (`ui/toast.tsx:56`):
  - En pantallas de menos de 400 px se corta por la izquierda.
  - Los errores desaparecen a los 4,5 s sin pausa (WCAG 2.2.1).
  - Se anuncian como `role="status"`.
- **D4. `Dialog` base** (`ui/dialog.tsx:55`):
  - No tiene margen lateral, `max-h` ni scroll interno.
  - Unos 30 consumidores lo reajustan cada uno a su manera.
  - `FormDialogContent` ya existe, pero la mitad no lo usa.
- **D5. `Dialog` con restos del tema oscuro.** `border-white/[0.08]` es invisible sobre fondo blanco y la sombra tiene opacidad 0,6.
- **D6. El dashboard no tiene enlace «Saltar al contenido»** (WCAG 2.4.1). La landing sí lo tiene.
- **D7. Vista mensual de la agenda** (`week-calendar.tsx:276-286`):
  - Los objetivos táctiles miden 24 px y 16 px.
  - El `aria-label` usa la fecha ISO.
  - El estado de la cita no está en el nombre accesible.
  - «+N más» no se puede pulsar.
- **D8. Faltan tokens semánticos de estado** (advertencia, éxito, información). Hay unas 1.100 clases de paleta cruda y textos de estado con contraste cercano a 3:1. [conocido en baseline:31, pero el alcance es mayor]
- **D9. `app/dashboard/loading.tsx` dice «Cargando Inicio…» en unas 12 rutas que no tienen `loading.tsx` propio.**
- **D10. La ficha operativa de la mascota muestra el error y el éxito con el mismo estilo** (`operational-pet-sheet.tsx`).
- **D11. Los primitivos son menores de 44 px** (`Button h-10`, `TabsList h-8`) y se compensan con unos 400 `min-h-11` dispersos. [conocido en parte]

### Baja

- Hay tres `SELECT_CLASS` distintas. Usan `text-sm`, y con 14 px iOS hace zoom al enfocar.
- `Textarea` no tiene estilo para `aria-invalid`.
- Modo oscuro:
  - La clase `.dark` nunca se aplica.
  - Hay 92 variantes `dark:` que nunca se ejecutan.
  - La paleta oscura usa un azul que no es el de la marca.
  - También quedan utilidades CSS sin uso (`glow-*`, `neon-*`).
- 13 de 16 animaciones no respetan «reducir movimiento».
- En el breadcrumb, el último elemento no tiene `aria-current` y algunas etiquetas están en inglés.
- La marca usa colores hex fijos que no coinciden con los tokens.

---

## 3. Coherencia entre la interfaz y el backend

- **Ningún endpoint roto.** Se cruzaron 189 rutas contra las llamadas del frontend y los métodos HTTP coinciden. La forma de las respuestas se comprobó en una muestra de unos 10 endpoints.
- **La regla de `apiUrl` en componentes cliente se cumple** (grep exhaustivo).
- **No hay mocks, TODOs ni botones sin handler.** La «Vista de ejemplo» de la Agenda solo aparece en desarrollo.

### Hallazgos

- **C1. «Operación centralizada» (`admin/tenants-overview`) falla sin `?tenant=`.** [nuevo]
  - El proxy consulta `/api/dashboard/access` sin `X-View-All-Tenants`, recibe un 403 y manda al usuario a `/session-recovery`.
  - Con `SINGLE_TENANT_ID`, el backend responde siempre 403 (`resolveTenant.js:68-71`).
  - Ningún enlace lleva a la página, y aun así figura en la navegación de todo administrador.
- **C2. Escalaciones y límite de autonomía de los Empleados Digitales sin pantalla** (`agents.routes.js:61-151`). [nuevo] CLAUDE.md (5.3) afirma que la escalación «ya está expuesta en el dashboard». Si alguien configura `autoApproved:false`, los recordatorios se convierten en escalaciones que nadie ve.
- **C3. Liquidación y anulación de comisiones y períodos financieros sin pantalla** (`staff.routes.js:414-454`, `financial-periods.routes.js:45-68`). [nuevo]
- **C4. Agenda y Administración muestran «El servidor de datos no está disponible» ante un 401, 403 o 500** (`calendar/page.tsx:48-53`, `settings/page.tsx:59-63`). [nuevo]
- **C5. Errores silenciosos** con `.catch(() => {})`. [nuevo]
  - En el cierre diario, los nombres del equipo pasan a decir «Profesional» (`daily-close-panel.tsx:45`).
  - El refresco de consultas falla sin aviso (`vet-consultations-view.tsx:156`).
  - El sondeo del vínculo de WhatsApp tampoco avisa.
- **C6. Código muerto y endpoints sin consumidor.**
  - `components/dashboard/home/fetchers.ts` exporta 11 funciones y ninguna se usa.
  - Hay unos 10 endpoints legados sin consumidor (`/stats`, `/metrics/revenue`, `/clients/import`, `PUT /staff/:id/availability`, entre otros).

---

## 4. Fortalezas

1. **Permisos coherentes en el servidor.** Un solo manifiesto por rol y módulo alimenta el menú, las acciones rápidas y el proxy. No se llega por URL a una pantalla no autorizada.
2. **Formularios accesibles.** `useFormFeedback` y `FormField` usan `aria-invalid` y `aria-describedby`, llevan el foco al primer error y avisan con `role="alert"`.
3. **Confirmaciones seguras.** `useActionConfirmation` y `ProtectedDialog` protegen Escape, el clic de fondo y `beforeunload`.
4. **Rutas consolidadas.** Churn, oportunidades, reactivación, reportes, servicios y personal redirigen a una pestaña canónica, sin pantallas duplicadas.
5. **Páginas públicas pulidas en móvil** (verificado en vivo):
   - sin scroll horizontal;
   - etiquetas asociadas y `autocomplete` correcto en el login;
   - validación nativa en el onboarding;
   - imágenes con `alt`.
6. **Tablas adaptadas a móvil.** Clientes, Mascotas e Inventario cambian a tarjetas.

## 5. Prioridad sugerida

1. P1: decidir y documentar si Inventario depende de Pet shop. Si no debe depender, revertir la condición.
2. P2, P3 y P8: dar un enlace a Facturación y alinear el mensaje entre beta cerrada, registro abierto y checkout.
3. P4: enlazar las páginas legales desde el pie y el registro, y confirmar las variables `HUELLA_NEX_LEGAL_*` en producción.
4. D1 y D3: migrar el «Resumen del día» a `Dialog`; hacer que los errores del toast sean persistentes o asertivos y corregir su ancho en móvil.
5. D2: unificar el selector de especie.
6. C1 y C4: corregir el acceso de superadmin y los mensajes de error genéricos.

## 6. No cubierto

- Renderizado del dashboard autenticado (no había base de datos ni backend).
- Medición instrumental del contraste: las cifras son aproximadas a partir de la paleta de Tailwind.
- Verificación campo por campo de las 189 respuestas del backend.
- Seguridad: existe una auditoría aparte y no estaba en el alcance.
