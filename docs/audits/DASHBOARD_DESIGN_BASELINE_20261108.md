# Base de la revisión visual del dashboard de Huella Nex

Fecha: 08/11/2026, Colombia. Primera inspección de código; no es una auditoría
visual completa ni una certificación de accesibilidad. El objetivo es mejorar
el uso diario conservando las funciones y la identidad de Huella Nex.

## Herramientas y conexión

- Design System: inventario de componentes y consistencia.
- Impeccable: disponible para las siguientes etapas de UX y refinamiento.
- Accessibility Review y Playwright: comprobaciones de uso y navegador.
- Figma: conectado el 09/11/2026. El usuario eligió el equipo `the-renkar`.
  Archivo: [Dashboard y navegación](https://www.figma.com/design/XgkNYjmoivFxTtgUdTfVbP).
  El concepto editable contiene ejemplos ficticios, sin datos de clientes.

## Base existente que conviene reutilizar

Hay componentes comunes para botones, etiquetas, tablas, tarjetas, formularios,
diálogos, mensajes y estados vacíos. El marco común separa menú, encabezado,
migas de navegación y contenido. El menú ya filtra opciones según permisos.
El encabezado reserva espacio para el menú móvil. No reconstruir estos
comportamientos ni sustituir controles existentes por un kit visual completo.

## Hallazgos iniciales y siguientes comprobaciones

| Prioridad | Evidencia en código | Trabajo propuesto |
| --- | --- | --- |
| 1 | `dashboard-sidebar.tsx` pinta el enlace activo, pero no declara `aria-current`. | Comunicar la página actual también a las tecnologías de asistencia. |
| 1 | El encabezado usa enlaces de icono con `title` para WhatsApp y Agenda. | Dar nombres accesibles explícitos y comprobar foco, teclado y espacio en móvil. |
| 2 | `button.tsx` tiene altura predeterminada 40 px; el menú y las acciones del encabezado usan 44 px. | Definir tamaños por uso: acciones principales táctiles y acciones compactas de tablas; no aumentar todos los controles indiscriminadamente. |
| 2 | El marco usa un fondo hexadecimal; menú y encabezado combinan tokens semánticos con colores `teal` y `slate` explícitos. | Documentar y reutilizar una paleta semántica antes de cambiar colores por pantalla. |
| 2 | Inicio reúne saludo, título de jornada, fecha, acciones rápidas, estado de servicios y espacio operativo. | Inspeccionar la jerarquía en los perfiles reales: qué necesita verse primero y qué puede quedar secundario. No decidirlo solo por el código. |
| 3 | Inicio, Agenda y Caja tienen componentes y estados propios. | Diseñar densidad de tablas, filtros, acciones y etiquetas con ejemplos coherentes, manteniendo sus distinciones operativas. |

Archivos inspeccionados: `dashboard-frame.tsx`, `dashboard-topbar.tsx`,
`dashboard-sidebar.tsx`, `ui/button.tsx`, `ui/badge.tsx`,
`app/dashboard/page.tsx` y el inicio de `today-schedule.tsx`.

## Orden de trabajo

1. Marco común: menú, encabezado, búsqueda, navegación y comportamiento móvil.
2. Inicio: jerarquía de la jornada y accesos útiles por perfil.
3. Agenda: filtros, lectura de las citas y acciones.
4. Punto de venta: cliente, artículos, carrito y confirmación del pago.
5. Extender patrones aprobados a Inventario y fichas.

Antes de rediseñar una pantalla, observar su versión actual con datos de
ejemplo y registrar estados normal, vacío, carga, error y tamaño móvil.
Los prototipos externos deben usar datos ficticios. Los flujos de cobro,
comisiones, inventario, autenticación y permisos conservan sus reglas.

No hubo cambios funcionales del dashboard, instalaciones de dependencias de
la aplicación, commit, push ni despliegue en esta primera inspección.

## Primera implementación — 09/11/2026

Se refinó el marco compartido, manteniendo las reglas de acceso y negocio:

- Menú móvil con diálogo modal, foco contenido, cierre mediante Escape,
  devolución del foco y cierre al pasar al tamaño de escritorio.
- Controles de abrir/cerrar menú y salir de sesión de 44 px; espacio reservado
  para el cierre junto a la marca.
- Página actual declarada con `aria-current`; nombres accesibles explícitos
  para las acciones del encabezado y colores semánticos compartidos.
- Encabezado en dos filas hasta escritorio ancho para evitar aglomeración en tablet.

Validación: lint, build de producción aislado y las 13 situaciones del arnés
`scripts/verify-home-fixtures.cjs` pasaron. La comprobación adicional de navegación
verifica cinco anchos (320, 390, 768, 1024 y 1440 px), objetivos táctiles,
separación, teclado, foco, selección, cambio de tamaño y enlaces del establecimiento.
El detector de Impeccable no señaló hallazgos en los tres archivos del marco.
No equivale a una auditoría completa de accesibilidad ni de todos los módulos.

Figma contiene tres vistas de concepto, con 69 capas de texto, 31 instancias
de componentes y ninguna imagen de interfaz aplanada. Es una propuesta editable
de navegación; no reproduce todas las funciones de Inicio.

Capturas locales ignoradas por Git: `.cache/home-verification/navigation-*.png`.
Las pruebas usan servicios simulados en memoria y no escriben datos de producción.
Esta etapa permanece local, sin commit, push ni despliegue.

## Inicio y agenda del día — 09/11/2026

Los accesos principales ahora son compactos y el estado técnico del servicio
queda después del contenido operativo. Se conserva el alcance por perfil,
los permisos y la separación de establecimientos. El resumen de estados ocupa
menos altura y las filas separan servicio/profesional de los importes.
En móvil, las acciones de cada cita tienen su propia fila y objetivos de 44 px.

Validación: lint y build aislado aprobados; 13 escenarios de navegador,
cinco anchos (320–1440 px), filtros En espera/Terminadas/Todas y paginación
de 13 citas en dos páginas (10 + 3). Las 20 pruebas de reglas de agenda,
adaptabilidad e Inicio pasaron. El detector visual no reportó hallazgos
en los cuatro archivos modificados. Se revisaron capturas de escritorio
y móvil con datos ficticios en .cache/home-verification/home-refined-*.png.
No se modificaron datos de producción ni se hizo commit, push o despliegue.

### Refinamiento adicional de la agenda

Se conserva, por preferencia expresa del usuario, el contenedor blanco de
acciones rápidas con sus tres tarjetas amplias y descripciones. La agenda
usa iconos Lucide, actualización visible también en móvil y filtros agrupados
con nombre accesible. Los importes recibidos destacan como Cobrado; los
pendientes conservan su Referencia y el enlace Registrar pago. No se cambiaron
cálculos, estados de negocio, precios, permisos ni registros.
Se añadieron ejemplos ficticios de nombres largos y de pagos recibidos y
pendientes con domicilio a la comprobación de navegador.

## Agenda completa — 09/11/2026

Se refinó week-calendar.tsx: barra de fecha/período con controles de 44 px,
vistas en dos columnas en móvil y grupos accesibles de vista/formato de hora.
Los días declaran selección, fecha actual y cantidad de citas. La cuadrícula
horizontal tiene región nombrada y foco de teclado; las citas incluyen su
estado en el nombre accesible y en el texto emergente. No se cambiaron reglas
de agendamiento, horarios, cálculos de posición ni permisos.

Lint y build de producción aislado aprobados. El ensayo de navegador comprobó
las cuatro vistas, selección de día desde el mes, formato 24h, cuatro anchos
(320, 390, 768 y 1440 px), tamaño táctil y continuidad del establecimiento,
además de los 13 escenarios existentes de Inicio. Capturas ficticias en
.cache/home-verification/calendar-refined-*.png. El detector señaló el borde
lateral preexistente de las citas: se conserva porque comunica su estado
junto con la leyenda y los nombres accesibles; no se añadió decoración nueva.

La revisión sigue local. La sincronización de Figma tiene pendiente el ajuste
de alturas de las filas debido a la indisponibilidad de su herramienta de edición.

## Punto de venta — 09/11/2026

Se refinó la presentación de Cobrar: navegación de secciones adaptable a móvil,
controles táctiles de 44 px, grupo accesible de catálogo y de métodos de pago.
El carrito separa descripción, cantidad, subtotal y eliminación; los resultados
del catálogo colocan el precio debajo del nombre para evitar estrechar nombres
largos. El panel de resumen y pago tiene nombre accesible. Se conservan la
base de caja compacta, una sola búsqueda, selección inicial Todos y pago mixto.
No se modificaron cálculos, persistencia de ventas, comisiones ni descuentos de stock.

Validación: lint y build aislado aprobados, 21 pruebas de checkout/pago mixto/
catálogo y verificación de navegador a 320, 390, 768 y 1440 px. Se preparó una
venta ficticia con cambios de cantidad y reparto 20.000 + 30.000; las escrituras
de venta estuvieron bloqueadas y no hubo intentos. Se revisaron capturas de
catálogo con nombre largo, carrito móvil y vista de cobro. El detector no
reportó hallazgos en los tres componentes modificados.
Esta etapa sigue local, sin commit, push ni despliegue.

## Caja diaria y cierre — 09/11/2026

Se ajustaron cashbox-view, operational-cash y daily-close-panel para dar espacio
a importes y nombres largos, consultas de fecha y período, controles de 44 px y
agrupaciones adaptadas a móvil. Los selectores de comisiones alinean sus botones
en escritorio. La confirmación de cierre conserva la validación del efectivo
retenido, advertencias, historial y bloqueo del día cerrado. No se cambiaron
cálculos, pagos de comisiones ni persistencia financiera.

Validación: lint, build aislado, 10 pruebas existentes de caja/base/comisiones,
y prueba de navegador a 320, 390, 768 y 1440 px. Se abrió el diálogo, se validó
el importe retenido y se volvió a revisar sin confirmar. Se simuló un día cerrado
y se verificó su bloqueo. Todas las escrituras financieras estuvieron bloqueadas
y no hubo intentos. Las cifras del ensayo (ingresos 66.000,30; gastos 10.000,05;
comisiones 14.000; saldo 42.000,25) son ficticias. Capturas en
.cache/home-verification/cash-*.png. El detector final no reportó hallazgos.
Sin commit, push ni despliegue.

## Gastos — 09/11/2026

Se refinó el formulario, su resumen y la consulta histórica: controles de 44 px,
grupos accesibles de categoría/medio de pago, resumen con actualización anunciada,
fechas en una cuadrícula adaptable y filas con espacio para descripciones largas,
importe y estado. El diálogo de salida conserva foco, advertencia y acciones;
se ajustaron sus márgenes, altura y botones para móvil.

Lint y build aislado aprobados; siete pruebas existentes de importes, intentos
pendientes, coincidencia y consulta histórica pasaron. La prueba de navegador
comprobó formulario a 320, 390, 768 y 1440 px, validación sin enviar, resumen con
centavos, protección de datos sin guardar, regreso a edición, filtro de anulados,
notas y motivo de anulación. Todas las escrituras financieras estuvieron bloqueadas
y no hubo intentos. El detector no reportó hallazgos en los tres componentes.
Capturas con datos ficticios: .cache/home-verification/expenses-*.png.
No se cambiaron reglas financieras ni se hizo commit, push o despliegue.

En la revisión visual de Gastos se detectaron avisos de validación obsoletos después de corregir campos. Ahora se retira únicamente el aviso del campo cuyo valor ya es válido; la validación al enviar se conserva. La prueba de navegador comprueba aria-invalid y la retirada de esos avisos.

## Categorías para los tres tipos de negocio — 09/11/2026

Se amplió Gastos de siete a 16 categorías, organizadas en Compras e insumos,
Operación y servicios, Personal y local y Administración. Incluyen compras
para venta, insumos veterinarios/peluquería, laboratorio, domicilios/transporte,
aseo, mantenimiento, equipos, software y comisiones bancarias. Se conservan
los siete códigos históricos; no se reclasificaron registros ni se requiere
migración de datos (Expense.category sigue siendo String).

El backend usa un catálogo compartido para registrar, filtrar el historial y
preparar comandos del asistente; el frontend comparte etiquetas y grupos
con el formulario, resumen y filtros. La recuperación de intentos acepta
las nuevas categorías. Compras para venta aclara que el gasto no registra stock.
No se crean movimientos automáticos de inventario ni pagos de comisiones.

Validación: lint/build, 71 pruebas en cuatro suites backend y 10 comprobaciones
de contrato/egresos. Se probaron todos los códigos al registrar con repositorios
ficticios, recuperar intentos y filtrar historial. El navegador comprobó las
16 opciones y grupos a 320, 390, 768 y 1440 px, selección de insumos veterinarios
y continuidad de la validación y protección de datos sin guardar.
Sin datos de producción modificados, commit, push ni despliegue.

Corrección solicitada: se simplifica la captura a seis categorías (Insumos y productos, Personal, Arriendo, Servicios, Equipos y mantenimiento, Otros gastos). El asistente y los filtros usan las mismas seis opciones. Las claves anteriores siguen reconocidas para conservar lectura y recuperación, sin reclasificar ni borrar gastos.


## Historial de cobros y comprobantes — 09/11/2026

Se conserva la estructura y los filtros existentes. Los períodos rápidos se
ordenan en dos columnas en celular y los controles y la paginación tienen
áreas táctiles de al menos 44 px. Las filas separan el importe y las acciones
en pantallas estrechas; nombres y notas extensos ajustan su ancho y los
artículos muestran dos líneas antes de abrir el detalle.

El comprobante tiene encabezado estable, contenido desplazable y acciones
visibles al pie. La tabla reserva espacio para los importes, ajusta nombres
largos y mantiene el desglose efectivo/transferencia, el total y las advertencias
de operaciones anuladas. Se conserva la comprobación del establecimiento antes
de habilitar Imprimir, el contenido de impresión y los permisos financieros.

Validación final: lint y compilación correctos, 22 pruebas de historial,
recuperación y pagos mixtos; ensayo aislado completo de 13 escenarios de roles,
módulos y fallos. La nueva comprobación de navegador cubre 12 operaciones en
dos páginas, filtros de método/estado, comprobantes mixtos y anulados, nombres
sin espacios y anchos de 320, 390, 768 y 1440 px. Todas las escrituras de negocio
estuvieron bloqueadas y no se intentó ninguna. Capturas sintéticas revisadas
en .cache/home-verification/history-*.png y receipt-*.png. Detector visual sin
hallazgos. No se cambiaron datos reales ni se hizo commit, push o despliegue.
Figma sigue pendiente de sincronización por falta de acceso de edición.


## Reportes — 09/11/2026

Se conserva el contenido, las comparaciones y las reglas de cálculo. La selección
Semana/Mes/Año ocupa el ancho disponible en celular y las acciones tienen
objetivos táctiles de 44 px. Los importes ajustan su tamaño en pantallas pequeñas,
los nombres de profesionales y servicios extensos ajustan el ancho y las
comparaciones heredan el color de su indicador.

La vista de impresión tiene encabezado y acciones estables, desplazamiento
interno, tablas de ancho fijo y texto ajustable. Se mantiene la comprobación
de coincidencia entre resumen y desglose para exportar, el establecimiento del
reporte, los enlaces de detalle con tenant y el contenido de Excel/PDF.

Validación: lint y compilación correctos; 11 pruebas de reportes, desglose de
pagos mixtos, centavos, enlaces de detalle y Excel. Ensayo en navegador con
datos sintéticos: totales y reserva profesional, período anterior/actual, cambio
a semana y comparación equivalente, enlace de ingresos con tenant, descarga
Excel, vista de impresión, fallo de lectura y reintento, estados vacíos y anchos
de 320, 390, 768 y 1440 px. Se bloquean todas las escrituras financieras y no
se intentó ninguna. Capturas revisadas: .cache/home-verification/reports-*.png.
Detector visual sin hallazgos. Sin cambios de datos reales, commit, push o
despliegue. Figma continúa pendiente de sincronización por falta de edición.


## Reportes por fechas — 09/11/2026

A solicitud del usuario se añade «Por fechas» junto a Semana/Mes/Año, con Desde,
Hasta y Consultar fechas. El rango incluye completos ambos días en Bogotá y
admite hasta 366 días, coherente con los límites del detalle del historial.
Debe comenzar hoy o antes; puede terminar en un día posterior y se informa si
está en curso. La comparación usa el rango inmediatamente anterior de igual
duración. No cambia los períodos de calendario existentes.

El backend aplica el mismo intervalo a ingresos, gastos, comisiones, citas,
clientes y servicios. Se conserva el tenant autenticado y la exclusión de
movimientos anulados. El contexto anual continúa mostrando el año de inicio
del rango, separado de los totales seleccionados. Los enlaces de detalle y
retorno conservan las fechas; Excel y la vista de impresión identifican el
mismo intervalo y criterio de comparación. No requiere migración.

Validación: lint/build; 12 pruebas frontend y 19 backend con Prisma simulado.
Se comprueban Bogotá, inclusión del día final, rango de un solo día, febrero
bisiesto, 366 días, cruce de año, comparación sin solapamiento, filtros de
ingresos/gastos/comisiones/artículos/servicios y rechazo de entradas inválidas
antes de consultar datos. En navegador aislado se consultó 11/10–11/11, se
comprobó el enlace de detalle, la impresión y el nombre del Excel exportado,
además de validación y tamaños 320/390/768/1440. Se bloquearon todas las
escrituras de negocio y no hubo intentos. Captura sintética revisada:
.cache/home-verification/reports-custom-390.png. Detector visual sin hallazgos.
Sin cambios de datos reales, commit, push ni despliegue.


## Inventario — 09/11/2026

Se conserva el flujo de catálogo, existencias iniciales, entradas y correcciones.
Se ajusta el encabezado para celular, los filtros y controles a un mínimo de
44 px y la lectura de nombres, códigos, lotes y responsables largos. La tabla
en escritorio y las tarjetas en móvil conservan precios, existencias y acciones.

La ficha de producto distribuye el espacio entre encabezado, pestañas, cuerpo
desplazable y acciones al pie. Se mejoró el ajuste de textos del historial y
la presentación de sus iconos. Los formularios de producto, entrada y corrección
conservan validación, protección de cambios y recuperación de operaciones;
los campos ahora tienen objetivos táctiles de 44 px. No se alteró el cálculo
de existencias ni las reglas de eliminación o de edición de movimientos.

Validación final: lint/build y siete pruebas de inventory-display correctos.
Comprobación aislada en navegador a 320, 390, 768 y 1440 px: tarjetas/tabla,
filtros, búsqueda sin resultados, paginación, lotes y movimientos, preparación
de entrada y saldo previsto, edición de cantidad/costo, existencias iniciales
con lote/vencimiento, validación vacía, continuar/descartar cambios y acceso a
Eliminar en un producto desactivado. Todas las escrituras de negocio estuvieron
bloqueadas y no hubo intentos. Los datos fueron completamente ficticios.
La comprobación espera las animaciones del diálogo antes de medir posiciones.
Capturas revisadas: .cache/home-verification/inventory-*.png. Se añadió
--inventory-visual-only al ensayo para comprobar esta pantalla sin repetir el
resto de módulos. Detector visual sin hallazgos. No se modificaron datos reales
ni se hizo commit, push o despliegue. Figma sigue pendiente de sincronización.


## Clientes y mascotas — 09/11/2026

Se conserva la información y los flujos de contactos. La navegación Clientes/
Mascotas, búsquedas, borrado de búsqueda y paginación tienen objetivos táctiles
de 44 px. Las tarjetas ajustan nombres extensos; la tabla de mascotas se muestra
desde escritorio y envuelve textos y acciones sin ensanchar la página.

Se ajustaron las fichas de propietario y mascota para leer nombres, teléfonos,
dirección, barrio y datos clínicos en pantallas pequeñas. El botón de nueva cita
con nombre extenso y el guardado de peluquería/domicilio pueden envolver el texto.
Al agregar una mascota se muestra el propietario completo. Los formularios de
nuevo propietario y mascota conservan sus campos y tienen controles más cómodos.
Se mantienen permisos, antecedentes, edición protegida y reglas de guardado;
no se modificaron APIs ni datos de clientes, mascotas o citas.

Validación final: lint/build y nueve pruebas de perfiles/navegación correctos.
Ensayo aislado con 51 clientes y mascotas ficticios: listado, dos páginas, búsqueda
sin resultados, teléfonos alternativos y ubicación, edición de propietario con
continuar/descartar, nuevo propietario con dos mascotas sin guardar, antecedentes
de alergia e historial, valores habituales de peluquería y domicilio y búsqueda
de propietario para agregar mascota. Se revisaron anchos 320, 390, 768, 1024 y
1440 px, límites de los diálogos y textos dentro de botones. La comprobación
espera el aviso de cambios sin guardar antes de cerrar el editor de precios.
Todas las escrituras de negocio estuvieron bloqueadas y no hubo intentos.
Capturas sintéticas revisadas: .cache/home-verification/contacts-*.png. Se añadió
--contacts-visual-only al ensayo. Detector visual sin hallazgos. Sin commit,
push ni despliegue. Figma continúa pendiente de sincronización.


Corrección de Expediente (09/11/2026): se reserva el ancho de las acciones y se
mantienen Ver/Editar/Eliminar en una sola fila. La tabla aparece desde 1280 px;
en pantallas menores se conservan las tarjetas. Compilación, lint y verificación
visual aislada correctos, con acciones alineadas a 1280/1440/1920 px y sin
desbordamiento en 320/390/768/1024 px. Captura sintética revisada:
.cache/home-verification/contacts-pet-actions-1920.png. Sin escrituras reales.


## Consultas veterinarias — 09/11/2026

Se conservan los campos y acciones clínicas existentes. Los filtros de período,
profesional, semana y búsqueda tienen controles de 44 px y una distribución
que cabe en celular. Los textos de paciente, propietario y profesional ajustan
el ancho; las acciones de las citas tienen más espacio para evitar amontonarse.

La historia clínica mantiene encabezado y acciones estables, contenido
desplazable y navegación por secciones en dos columnas en móvil. Se ajustaron
los controles, los antecedentes, el historial de correcciones y el formulario
de antecedente sin cita para lectura y uso táctil. No se alteraron permisos,
reglas de atención, seguimiento, edición de versiones ni los endpoints.
Se retira un aviso de validación cuando su campo ya es válido (evaluación,
profesional o peso); se conservan mensajes de servidor y conflictos.

Validación final: lint/build y nueve pruebas de perfiles, fechas e historial
correctos. Ensayo aislado con consultas y registros ficticios: búsqueda anterior,
filtros del historial y expansión de resultados, preparación de evaluación,
validación vacía y retirada del aviso resuelto, seguir editando/descartar,
consulta guardada, lectura de correcciones y motivo obligatorio para corregir
una consulta finalizada. Se comprobaron 320/390/768/1440 px y acciones al pie.
Las capturas esperan dos cuadros y el fin de animación tras cambiar el viewport.
Se bloquearon todas las escrituras clínicas, de estado y de inventario; no hubo
intentos. Capturas revisadas: .cache/home-verification/clinical-*.png. Se añadió
--clinical-visual-only al ensayo. Detector visual sin hallazgos. Sin modificación
de datos reales, commit, push ni despliegue. Figma sigue pendiente de sincronizar.


Simplificación operativa de Consultas (09/11/2026): a petición del usuario,
se sustituyen las cinco tarjetas superiores por estados compactos dentro del
listado, con Todas y los conteos existentes. Profesional y asignación quedan
en Más filtros; se avisa si hay una asignación activa. El selector de fechas
se muestra al elegir Semana. La búsqueda sigue incluyendo todas las fechas.
Las acciones principales se nombran Abrir consulta y Ver consulta; se conservan
los permisos y las condiciones de llegada, atención y finalización. El pie de
la historia en una cita En atención aclara que Guardar consulta guarda la
historia y que Finalizar cita se realiza después desde el listado.

Validación: lint/build y ensayo clínico aislado correctos. Se comprobaron
filtros secundarios cerrados/abiertos, selección y limpieza de profesional,
Hoy/Semana, estados compactos, apertura/lectura/edición de consultas, historial
y protección de cambios en cuatro tamaños de pantalla. Sin escrituras de
negocio. Capturas de listado clínico revisadas en móvil y escritorio.
No se alteraron los campos ni las validaciones clínicas. Sin publicación.


## Peluquería: vista rápida (09/11/2026)

Vista rápida predeterminada, con Vista completa disponible. Buscar, Hoy,
Actualizar y etapas quedan a mano; fecha, profesional y archivo se agrupan
en Más filtros. Cada mascota muestra su siguiente acción operativa; cuidados,
notas, asignación y precio siguen accesibles en Acciones. Se conservan los
permisos, la tolerancia de llegada, las visitas anteriores y los estados.

Preparar atención mantiene visibles los cuidados y la última nota anterior.
Los datos adicionales y las notas opcionales se despliegan a petición. Si
se escriben notas, deben guardarse antes de iniciar en modo rápido, que vuelve
al listado al empezar. Se conserva la protección de cambios sin guardar.
Terminar conserva la comprobación de precio y la entrega continúa separada
del registro del pago. Diálogos con contenido desplazable y acciones al pie.

Validación: lint y compilación aislada correctos; detector visual sin hallazgos.
Ensayo de navegador con datos ficticios en 320/390/768/1440 px: modo rápido y
completo, filtros secundarios, registro de llegada, acceso al precio/notas,
cuidados visibles antes de iniciar, notas opcionales, protección de cambios,
guardado de versión, inicio, precio pendiente bloqueado, finalización y entrega.
Cinco operaciones simuladas en memoria; cero escrituras en base de datos.
Capturas revisadas: .cache/home-verification/grooming-*.png.
Sin commit, push ni despliegue. Sincronización de Figma pendiente.

Ajuste solicitado: se elimina Vista completa y el selector de modos.
Peluquería conserva únicamente el recorrido rápido; Más filtros y Acciones
mantienen disponibles el archivo, profesional, notas, asignación y precio.
Se retiran las ramas de presentación del modo completo en el listado.


## Nueva cita: distribución compacta (09/11/2026)

Se sustituyen los recuadros amplios y las descripciones repetidas por tres
secciones compactas: Cliente y mascota, Servicio y profesional, Fecha y hora.
Dos columnas desde sm, una en móvil; controles de al menos 44 px y texto largo
contenido. Diálogo hasta 768 px, encabezado y acciones estables, cuerpo con
scroll propio. No se cambian selección, disponibilidad, asignación, validación,
contrato de creación ni protección de cambios sin guardar.

Validación: lint, compilación aislada y detector sin hallazgos. Ensayo de
navegador en 320/390/768/1440 px: búsqueda por mascota, selección entre varias,
asignación automática con un peluquero, vacunación disponible, cambio de
profesional, reinicio de hora al cambiar servicio/fecha, ausencia de horarios,
pie siempre visible y conservar/descartar cambios. Todas las escrituras
bloqueadas, cero intentos; ninguna cita real creada. Capturas revisadas en
.cache/home-verification/booking-*.png. Sin commit, push ni despliegue.


## Nuevo propietario y mascotas: formulario compacto (09/11/2026)

Contacto sin recuadro exterior: nombre/teléfono en dos columnas y otros
teléfonos/dirección/barrio en tres desde sm; una columna en móvil. Notas del
propietario desplegables. Cada mascota conserva su propio bloque: nombre y
especie primero; peluquería/domicilio y cuidados visibles; raza, género y peso
en Más datos. Se conservan todos los campos y las reglas de permisos y envío.
Encabezado y pie fijos, controles de 44 px y título/acción más legibles.

Validación: lint/build correctos y detector sin hallazgos. Ensayo aislado de
contactos en 320/390/768/1024/1440 px, incluyendo dos mascotas, quitar la segunda,
conservación de varios teléfonos, notas desplegables, validación de peso que
reabre el apartado y protección de cambios sin guardar. Ninguna escritura
intentada en datos de negocio. Capturas contacts-new-owner-* revisadas.
Sin commit, push ni despliegue. Figma pendiente de sincronización.

Corrección solicitada: raza, género y peso se muestran siempre, justo debajo
de nombre/especie y antes de peluquería/domicilio, sin desplegable. Se conservan
sus valores, validaciones y permisos.


## Agregar mascota a un propietario existente (09/11/2026)

Búsqueda con botón explícito y resultados seleccionables (hasta ocho),
reemplazando la asignación silenciosa al primer resultado. Se confirma nombre
y teléfono del propietario en el formulario. Campos ordenados como en el alta
conjunta: nombre/especie, raza/sexo/peso y cuidados. Encabezado/pie estables,
contenido desplazable, una columna en móvil y controles táctiles. Cierre y
cambio de propietario protegen los datos pendientes.

Corrección funcional encontrada durante la revisión: sexo y peso tenían
controles pero no se enviaban ni se persistían desde esta ruta. Se agregan al
payload y al POST /pets, con validación de sexo/peso y permiso de administración
para peso. No se altera la resolución del propietario dentro del tenant.

Validación: lint/build, cinco pruebas HTTP con Prisma simulado y ensayo de
contactos en cinco tamaños correctos. Selección explícita, conservar cambios,
envío de sexo/peso y propietario comprobados con una creación simulada en
memoria; cero escrituras en base real. Capturas contacts-add-pet-* revisadas.
Detector sin hallazgos. Sin commit, push ni despliegue.


## Edición de propietario y mascota (09/11/2026)

Edición de propietario alineada con el alta: nombre/teléfono principal juntos,
otros teléfonos/dirección/barrio agrupados y notas desplegables (abiertas si
ya existen notas). Se conservan valores, validación, permisos y guardado.
En la mascota, nombre y especie (solo lectura) seguidos de raza/sexo/peso;
contacto del propietario después. Nacimiento, esterilización y notas conservan
su sección clínica. Peluquería/domicilio y alertas permanecen disponibles.
Guardar ficha/Cancelar se trasladan a un pie fijo durante la edición de Datos
y cuidados, para no depender del scroll. Sin cambios en APIs o reglas clínicas.

Lint/build, detector y ensayo aislado correctos. Se revisaron propietario y
mascota en 320/390/768/1024/1440 px; edición de raza/sexo/peso, ubicación de los
campos, pie visible y conservar/descartar cambios. El resto del recorrido de
contactos siguió pasando. Ninguna escritura en base real; el ensayo conserva
una alta ficticia respondida en memoria. Capturas contacts-owner-edit-* y
contacts-pet-edit-* revisadas. Sin commit, push ni despliegue.


## Expediente: jerarquía y espacio útil (09/11/2026)

Nueva cita se integra en el encabezado y se oculta durante edición de ficha.
Se elimina la fila vacía de estado/acción cuando no hay cambios. Resumen más
compacto; contacto del propietario distribuido en tres columnas en escritorio
y una en móvil. Las tres pestañas comparten una fila con texto adaptable.
Alergias y cuidados importantes conservan prominencia y acceso al detalle.
Altura del diálogo limitada al viewport con margen y pie de edición estable.

Lint/build, detector y ensayo de contactos correctos en cinco anchos; lectura,
pestañas, precios, edición, pie visible y protección de cambios permanecen
operativos. Capturas revisadas. Sin escrituras en base real ni publicación.

Ajuste visual del expediente tras revisión del usuario: resumen blanco con
borde y divisiones sutiles; pestañas de línea en lugar de la barra gris;
contacto del propietario recupera un contenedor compacto con título.
Se conservan distribución adaptable, datos y controles existentes.


Corrección Ver/Editar del expediente: Peluquería y domicilio ahora muestra
modalidad y valores guardados en lectura, sin inputs, select o botón de guardar.
El formulario solo se monta al editar. Cancelar protege tanto ficha como precios
y descarta los borradores al salir de edición. Guardar ficha mantiene la edición
abierta si quedan precios pendientes, evitando esconder o perder esos cambios.
Lint/build y recorrido aislado de contactos correctos: lectura sin controles,
edición con valores cargados y protección de borradores; sin escrituras reales.


Separación solicitada de Ver y Editar desde los listados: se retiran los botones
Editar internos del cliente, mascota y cuidados. Se conserva la entrada con
initialEdit desde cada fila. La ficha operativa queda en lectura al abrir Ver;
sus datos y alertas solo se editan al entrar desde Editar, con protección de
cambios. El historial de peluquería transmite el modo lectura a sus notas y se
ocultan las acciones de alta de antecedentes cuando el expediente abre en Ver.
Las rutas y permisos del servidor siguen vigentes. Ensayo de contactos adaptado
para cerrar Ver y abrir Editar desde el listado: correcto en cinco tamaños,
sin escrituras en base real. Lint/build correctos.


## Detalle de cita existente (09/11/2026)

Acciones de progreso en el pie; cancelar, inasistencia y eliminación se agrupan
en Otras acciones conservando disponibilidad y confirmaciones. El formulario
de precio queda junto al resumen y separado del domicilio; se aclara que se
edita el valor del servicio. Títulos largos adaptables. Cambios de estado
protegen borradores pendientes y esperan el guardado del domicilio.

Lint/build y detector correctos. Ensayo aislado en 320/390/768/1440 px: ficha,
precio, conservar/descartar borrador y recorrido de peluquería. Cinco operaciones
simuladas en memoria, ninguna escritura en base real. Capturas
.cache/home-verification/grooming-appointment-* revisadas. Sin publicación.


Alineación de fichas de cita solicitada: distribución compartida en dos columnas
iguales desde md y una en móvil, con altura estirada de ambas tarjetas. Consulta
usa Datos de la cita + Cobro de la atención; peluquería conserva Datos + Domicilio.
El valor de consulta sigue siendo referencia; no se agrega ninguna exigencia de
precio ni se cambian pagos, permisos, historia clínica o transiciones.
Lint/build, detector y ensayo correctos; se midieron igualdad de anchos/alturas
y alineación superior en 768/1440 px para ambas áreas, y ausencia de overflow
en 320/390 px. Capturas grooming-appointment-detail-* y grooming-veterinary-detail-*
revisadas. Sin escrituras reales ni despliegue.


## Equipo: ficha y tipo de contrato (10/11/2026)

Ficha, contrato y servicios quedan como acciones principales; permisos,
horario, ausencias, acceso y estado se conservan en Más opciones del integrante.
La explicación general de cuentas se vuelve desplegable. Datos de ficha en dos
columnas desde sm; creación/edición de ficha y contrato comparten guardado fijo
al pie del diálogo, cuerpo desplazable y controles táctiles de 44 px. Contrato
mantiene porcentaje profesional/establecimiento, límites, permiso y advertencia
sobre históricos. No se cambia la fórmula, API ni importe de ninguna comisión.

Lint/build, detector y ensayo aislado correctos. Equipo ficticio con fijo,
prestación y ficha inactiva: edición/alta, porcentajes 50/50, 60/40 e inválido,
cambio a fijo, conservar/descartar borrador y guardado visible en
320/390/768/1440 px. Todas las escrituras bloqueadas, cero intentos. Capturas
staff-contract-*, staff-member-* y staff-list-* revisadas. Sin publicación.


## Inventario: fichas de producto y movimientos (10/11/2026)

Revisión retomada a petición del usuario. Producto nuevo/editado conserva todos
sus campos, con identificación en dos columnas desde sm, secciones sin recuadros
repetidos, texto de unidades compacto y bloque visible de existencias iniciales.
Entradas agrupan cantidad y costo en una fila de escritorio; lote/vencimiento,
nota opcional y vista previa mantienen su lógica. Corrección de entrada comparte
la misma jerarquía y conserva el motivo requerido y el registro original.
Encabezados y pies estables, cuerpo desplazable, controles táctiles y márgenes
de viewport coherentes con los demás formularios.

Lint/build, detector y ensayo aislado correctos en 320/390/768/1440 px. Incluye
búsqueda/filtros/paginación, lotes/movimientos, entrada con vista previa, cantidad
y costo corregidos sin guardar, producto nuevo con existencias/lote/vencimiento,
edición sin alta de stock inicial, presentación bloqueada con movimientos,
protección de borradores y acceso a eliminar producto inactivo. Cero escrituras
en base real. Capturas inventory-product-*, inventory-product-edit-*,
inventory-entry-* e inventory-correction-* revisadas. No se cambian políticas de
stock, operaciones pendientes, permisos, costos ni eliminación. Sin publicación.

## Servicios y precios: catálogo y formulario (10/11/2026)

Catálogo con indicadores de reserva de horario y reparto de comisión; ayuda de
precios desplegable y nombres largos ajustables. Formulario compacto: nombre y
categoría, duración y precio en pares desde sm; reserva de horario y reparto
visibles. Encabezado y acciones fijos, cuerpo desplazable y controles de 44 px.
Se conserva la confirmación para descartar cambios. No se modifican API,
validaciones, tarifas, reglas de comisión, retiro ni eliminación.

Lint/build y detector correctos. Ensayo aislado en 320/390/768/1440 px con precio
vacío/gratuito, duración opcional sin turno, reparto/directo, edición y alta,
protección de borradores y confirmación de eliminación sin ejecutarla. Cero
intentos de escritura. Se corrigió la selección del escenario ficticio de
servicios y se unificó la respuesta ficticia del perfil. Capturas services-edit-*,
services-new-* y services-catalog-* revisadas. Sin publicación; Figma pendiente.

## Horarios y disponibilidad: formularios compactos (10/11/2026)

Días con apertura y cierre juntos también en móvil; controles de 44 px y estado
de configuración/herencia visible. Ayuda extensa desplegable. Áreas separadas
con divisores y su indicador habitual/propio, sin recuadros repetidos. Fechas
especiales con horas emparejadas, acciones separadas del formulario y nombres
y acciones ajustables. No se cambian payload, reglas de disponibilidad, cierre
de festivos, herencia, citas existentes ni permisos.

Lint/build y detector correctos. Ensayo aislado en 320/390/768/1440 px: copiar
lunes solo a días abiertos, herencia y edición de área independiente, rangos
inválidos, deshacer y navegación con borrador, fecha especial inválida y cancelar
confirmación de eliminación. Cero escrituras. Capturas hours-habitual-*,
hours-area-* y hours-especial-* revisadas. Sin publicación; Figma pendiente.

## Datos y áreas del negocio: simplificación visual (10/11/2026)

Datos del negocio con espaciado compacto, contacto en dos columnas desde sm,
descripción opcional desplegable y canal técnico de solo lectura conservado.
Áreas en una lista seleccionable con icono, información existente y estado
actual/pendiente; vista de accesos detallada desplegable. Controles de 44 px y
acciones ajustables. Confirmación de desactivación, selección mínima, permisos
y API sin cambios.

Lint/build, detector y ensayo aislado correctos en 320/390/768/1440 px. Nombre
obligatorio, datos opcionales, canal de solo lectura, navegación con borrador,
vista previa de tienda sola, confirmación de desactivación cancelada, bloqueo de
selección vacía y descarte. Cero escrituras. Capturas business-profile-* y
business-areas-* revisadas. Sin publicación; Figma pendiente.

## Seguimiento de clientes: filtros, listas y revisión de contacto (10/11/2026)

Filtros de pendientes y clientes alineados en escritorio y apilados en móvil;
períodos en dos columnas en pantallas estrechas. Nombres largos ajustables,
acciones táctiles y confirmaciones ajustables. Revisión de WhatsApp con cuerpo
desplazable y acciones al pie; singular/plural corregido. Resultados en filas
con cifra y explicación, sin tarjetas anidadas. Se conservan criterios de
seguimiento, permisos, API, selección entre páginas y confirmación de envíos.

Lint/build y detector correctos. Ensayo ficticio en 320/390/768/1440 px: acciones
y registros antiguos, búsqueda vacía, paginación, conversación inexistente,
selección válida/inválida, vista previa cancelada sin enviar, frecuencia y
resultados. Cero escrituras y cero mensajes. Capturas followup-pending-*,
followup-clients-*, followup-preview-*, followup-frequency-* y followup-results-*
revisadas. Sin publicación; Figma pendiente.

## Cierre de los cinco frentes visuales restantes (10/11/2026)

1. WhatsApp: controles táctiles consistentes, panel lateral con nombres largos
   ajustables y estado vacío referido al negocio. Se conserva bandeja/chat,
   búsqueda, borradores, asignación humana, permisos y confirmaciones.
2. Asistentes: encabezado común, formulario sin numeración redundante, controles
   de 44 px y resultados ajustables. El acceso privado por WhatsApp se distingue
   de las conversaciones de clientes. No se ejecuta IA ni se cambia su política.
3. Integraciones: columnas alineadas, controles táctiles, números largos y
   recuperación explícita cuando falla la carga. Alta de Meta, cupos,
   conciliación y sus condiciones de habilitación no se alteran.
4. Flujos secundarios: importación con archivo largo, controles y plurales;
   suscripción adaptable sin cambiar precios ni contratación; registro con
   controles táctiles y ajuste a 320 px; expediente adaptable en pantalla y A4.
   El sexo se traduce también para los valores male/female, además de M/F.
5. Revisión conjunta: navegación, foco, Escape, enlaces del establecimiento,
   perfiles y módulos; recorridos de agenda, caja, pagos mixtos, gastos,
   reportes, inventario, fichas, clínica y peluquería con servicios simulados.

Verificación final: lint y build aprobados; detector sin hallazgos en archivos
revisados. 84 pruebas unitarias existentes aprobadas, incluido acceso de
suscripción suspendida; su mock de React incorpora el efecto existente del
marco. Arnés general: 13 combinaciones de perfil/módulos/estados aprobadas,
con objetivos táctiles, navegación y foco entre 320 y 1440 px. Escenarios
adicionales para pantallas restantes en 320/390/768/1440 px: chat, búsqueda,
borrador, información del cliente, formularios de asistente, integración con
fallo y reintento, importación cancelada en vista previa, planes, impresión A4,
registro hasta revisión y bienvenida. No se enviaron mensajes, cobraron planes,
crearon cuentas, llamaron proveedores de IA ni escribieron bases de datos.
Los pocos cambios de pruebas operativas son respuestas simuladas en memoria.

Evidencia local ignorada por Git: .cache/final-ui-unit.log,
.cache/final-ui-regression.log, .cache/final-surfaces-verification.log y capturas
.cache/home-verification/final-*.png; PDF ficticio final-pet-report.pdf.

Alcance: cierre de esta ronda de refinamiento visual local. No certifica una
activación comercial de Meta, seguridad integral ni accesibilidad completa.
Sin commit, push ni despliegue. Sincronización final de Figma pendiente.


## Figma y autorización de publicación (10/11/2026)

Archivo existente XgkNYjmoivFxTtgUdTfVbP consultado mediante la sesión oficial
3de63fe2-d0ae-4033-8e60-199f68224f3f. Figma devolvió límite MCP del plan Starter
al intentar seguir consultando y editar; no se guardó ninguna sincronización.
El usuario eligió expresamente publicar y dejar Figma pendiente. La revisión de
interfaz local está completada en el alcance descrito; Figma no está actualizado.
