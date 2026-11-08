# Huella Nex 3.0.2 — mantenimiento de dependencias y código

Fecha: 2026-11-08. Alcance: mantenimiento posterior a la publicación de
seguridad 3.0.1. Backend y frontend declaran la misma versión 3.0.2.

## Cambios

- Retirada de Google Calendar, sus llamadas de sincronización, configuración
  de ejemplo y dependencia googleapis. La agenda sigue usando PostgreSQL.
  Se conserva el campo histórico `Appointment.googleEventId`, sin uso operativo.
- Jest 30.5.2, glob 14.0.4 y minimatch 11.0.5 en las ramas afectadas de desarrollo.
  Deepmerge utiliza una copia local con un parche de `__proto__`, licencia y
  procedencia conservadas, y pruebas de regresión. Ver
  `backend/vendor/deepmerge/README.md`.
- Retirada de 13 componentes, un hook y cinco SVG de plantilla sin consumidores.
- Sustitución del paquete general radix-ui y del scroll-area abandonado por las
  cinco primitivas utilizadas, manteniendo sus versiones exactas anteriores.
  El lockfile del frontend pasa de 629 a 586 entradas de paquetes: 43 menos.
- Override de minimatch en las herramientas de ESLint del frontend; las ramas
  antiguas fuera del rango afectado mantienen sus dependencias.

## Verificación local previa

- Auditorías completas de raíz, backend y frontend: cero avisos. npm audit no
  evalúa la copia local de deepmerge; sus pruebas de regresión se mantienen.
- Backend: 239 suites, 2.162 pruebas aprobadas.
- Helpers: 44 archivos, 304 pruebas aprobadas, incluidos 12 casos de seguridad
  y compatibilidad de dependencias.
- Frontend: lint y build con TypeScript correctos, también en el Dockerfile real.
- Imagen Linux: inicio, login e iconos responden 200 en un contenedor aislado.
- Higiene de publicación y consistencia de versiones verificadas.

## Despliegue y reversión

Esta versión no modifica el esquema ni añade migraciones. Se debe comprobar
que producción mantiene las 69 migraciones existentes y conserva la base
configurada por el backend. No se ejecutan comandos de cambio de esquema.

Antes de activar las nuevas imágenes se requiere CI aprobado, checkout remoto
limpio, respaldo cifrado reciente y registro de las imágenes anteriores.
La reversión recupera exclusivamente las imágenes de backend y frontend, sin
restaurar ni modificar la base de datos. Los gates de activación comprueban
versión, salud, canal del operador, autenticación y conservación de datos y
configuración. Las banderas operativas conservan su estado previo.

Dos fallbacks opcionales de Sharp continúan en el node_modules local de Windows
porque la política de ejecución rechazó su borrado. No se versionan ni se
copian desde esa instalación local a las imágenes de producción.

Este documento describe el alcance y el procedimiento; el resultado remoto
de CI y despliegue se registra como evidencia de la ejecución, sin darlo por
completado antes de verificarlo.
