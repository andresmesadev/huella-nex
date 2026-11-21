# BETA-02 — Recuperación independiente desde R2

**11 de noviembre de 2026.** Se cerró el ensayo de recuperación del dashboard
manual 3.0.4 desde un respaldo cifrado en Cloudflare R2, sin usar la VPS
de producción para descargar, descifrar o restaurar.

- El bucket privado usa R2 Standard y la regla de vencimiento de 14 días
  cubre el prefijo `postgres/`. La VPS envía cada 30 minutos con una
  credencial restringida al bucket.
- El conjunto más reciente al empezar, `mateos-pet-ai-20261111T173019Z`,
  se generó a las 12:30:19 y se descargó a las 13:00:47, hora de Colombia.
  La antigüedad del respaldo era de 30 minutos y 28 segundos, dentro del
  objetivo de una hora. La suma SHA-256 del archivo cifrado coincidió.
- La clave de recuperación se utilizó localmente. El volcado descifrado
  pasó por tubería a PostgreSQL 18 con pgvector y `pg_restore --exit-on-error`.
- PostgreSQL y el dashboard se ejecutaron en contenedores locales aislados,
  sin conectividad externa ni puertos publicados. Se desactivaron los
  trabajos programados y la aplicación accedió a la copia en solo lectura.
- Se verificaron 80 tablas, 69 migraciones aplicadas, cero índices inválidos
  y cero restricciones sin validar. El inicio de sesión temporal y diez
  lecturas autenticadas respondieron correctamente. Las huellas de las
  80 tablas coincidieron antes y después de las consultas.
- Desde el preflight con las imágenes disponibles hasta la última
  comprobación pasaron **43,742 segundos**. Se eliminaron los contenedores,
  sus volúmenes temporales y las credenciales efímeras.
- La siguiente copia, generada a las 13:00:17, apareció en R2 a las
  13:03:03. Esto comprobó una ejecución automática después de la inicial.

El tiempo medido cubre la recuperación local del dashboard con el equipo
de ensayo disponible. La reconstrucción de una VPS pública, DNS, TLS e
integraciones externas queda fuera de ese tiempo.

