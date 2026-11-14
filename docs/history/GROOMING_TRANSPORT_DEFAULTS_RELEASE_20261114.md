# Domicilio habitual en nuevas citas manuales — v3.1.1

Una mascota podía tener recogida y entrega y una tarifa de domicilio guardadas, pero una nueva cita creada desde Agenda omitía esos datos y se registraba como llegada al centro. Por ejemplo, $60.000 de servicio y $20.000 habituales de transporte terminaban mostrando solamente $60.000.

La creación manual de peluquería usa ahora la modalidad habitual explícita cuando no recibe una selección propia de la visita. Reutiliza el resolutor de precios y la validación de transporte existentes. El formulario informa que usará la preferencia de la ficha. El ejemplo queda en $60.000 de servicio, $20.000 de transporte y $80.000 de total; la base de comisión sigue siendo el servicio.

Una elección específica para la visita prevalece, incluso llegada al centro. La dirección sigue siendo obligatoria; cero es gratuito y nulo queda pendiente. Confirmar la tarifa requiere el permiso vigente. No se infiere recogida de una tarifa aislada ni se aplica transporte de peluquería a veterinaria. Cambiar la ficha no reescribe visitas anteriores. El flujo de WhatsApp conserva su contrato.

Diseño y reconciliación del alcance anterior: [cinco etapas](../architecture/manual-appointment-transport-preference-20261114.md). Se sincronizan backend, frontend y sus lockfiles en `3.1.1`; sin cambios de esquema ni nuevas migraciones.

## Validación específica

```text
Test Suites: 4 passed, 4 total
Tests:       61 passed, 61 total
Snapshots:   0 total
```

Se probaron la creación HTTP en el establecimiento autenticado, las tres modalidades de traslado, decisión expresa al centro, permisos, importes nulos/cero, dirección obligatoria, reserva veterinaria, finalización y checkout. Lint del frontend sin errores. La verificación posterior del despliegue y su commit se conservan como evidencia operativa privada.

## Despliegue y recuperación

Utilizar `scripts/deploy.sh` desde un checkout limpio de la VPS después de publicar y verificar CI. El cambio no necesita transformaciones de datos. Ante una regresión funcional, detener la publicación o revertir el commit mediante un nuevo commit y volver a construir los servicios; conservar los snapshots de las citas ya registradas. No sustituir una visita específica al centro por los valores de la ficha como mecanismo de recuperación.
