# Parche local de deepmerge para Jest

Base: `deepmerge@4.3.1`, distribución de npm, licencia MIT conservada en `LICENSE`.
`index.js` procede de `dist/cjs.js` y `index.d.ts` del paquete original.
SHA-256 del `dist/cjs.js` original:
`2e5160f84a1141bd927264afe4d15766f1e6cf07daef182b37ff53fea121de7d`.
Integridad del paquete original:
`sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==`.

Al 2026-11-08 no hay una versión publicada que corrija
[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
El problema se reprodujo con destinos nulos, sin prototipo y con una clave
propia `__proto__`; el resultado hereda propiedades inyectadas aunque
`Object.prototype` permanezca intacto.

El único cambio de implementación filtra `__proto__` en `getKeys`, que comparten
los bucles de copia del destino y del origen. Conserva el contrato de merge,
arrays, símbolos, tipos y opciones de 4.3.1. Se declara como dependencia local
de desarrollo y el override `$deepmerge` obliga a usar esa copia; actualmente
`jest-config` es su único consumidor transitivo. La instalación de producción
con `--omit=dev` no instala este paquete.

Este paquete es una copia local mantenida por el proyecto, no una publicación
corregida del proveedor. npm audit no comprueba vulnerabilidades de esta copia;
su cobertura depende de `scripts/development-dependencies.test.cjs`, además de
la batería completa de Jest. No retirar esas pruebas para conseguir un audit
limpio. Sustituir la copia por la versión oficial cuando publique un arreglo
equivalente y pase los mismos casos de regresión.
