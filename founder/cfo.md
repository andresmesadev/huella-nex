# CFO — resultado real pendiente; sensibilidad calculada

**No se conoce todavía la rentabilidad real de Huella Nex.** Se localizaron referencias de precios y supuestos de IA, pero no facturas ni registro horario suficientes para un presupuesto observado. Ver [fuentes y búsqueda](cfo-sources.md). Los siguientes números son escenarios deliberados, no costos encontrados ni pronósticos de ventas.

Unidad: establecimiento-mes de pago; moneda COP. Se supone precio de 49.000 **antes de impuestos** exclusivamente para calcular sensibilidad. El precio final y su tratamiento real deben verificarse. Los clientes de Mateos Pet no son cuentas SaaS que paguen a Huella Nex. El panel no genera la rampa de ventas.

## Qué pasa con el soporte

| Escenario hipotético | Variable por cuenta/mes | Fijo mensual | Contribución | Equilibrio mensual, cuentas enteras | Resultado operativo año 1 | Caja máxima necesaria | Recuperación del gasto inicial |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Acompañado | 18.000 | 750.000 | 31.000 | 25 | -4.133.000 | 5.173.000 | Fuera del año 1 |
| Eficiente | 12.500 | 600.000 | 36.500 | 17 | 1.268.000 | 2.749.500 | Mes 12 |
| Soporte intensivo | 43.000 | 750.000 | 6.000 | 125 | -8.058.000 | 8.558.000 | Fuera del año 1 |

Resultados del calculador original `unit_economics.py`, ejecutado sobre [acompañado](scenarios/accompanied/numbers.json), [eficiente](scenarios/efficient/numbers.json) y [soporte intensivo](scenarios/support-stress/numbers.json). Informes íntegros, con meses y pruebas de tensión: [A](scenarios/accompanied/cfo.md), [B](scenarios/efficient/cfo.md), [C](scenarios/support-stress/cfo.md). Todos los rubros y rampas de esos archivos son **supuestos**, salvo el precio de referencia tomado del proyecto.

En el escenario acompañado se asignan hipotéticamente 30 minutos mensuales por cuenta a 25.000/hora (12.500), provisión de cobro de 2.500 e incremento de infraestructura de 3.000. Infraestructura base 250.000 y mantenimiento/operación 500.000 completan 750.000 fijos. La tarifa horaria y el valor del VPS son parámetros de prueba; no salarios ni facturas verificadas. El trabajo de mantenimiento se separa del soporte directo para evitar duplicarlo.

El eficiente supone soporte 7.000 por cuenta, infraestructura base 350.000 y mantenimiento 250.000; no demuestra que se puedan lograr. El intensivo supone 90 minutos de soporte por cuenta a la misma tarifa horaria. Su equilibrio de 125 cuentas excede la capacidad de servicio asumida de 40.

La rampa de cada archivo describe **cuentas de pago activas en cada mes**, no altas nuevas. El primer mes tiene cero cuentas de pago. No demuestra retención ni cotizaciones aceptadas. Se divide cada valor entre 30 para la interfaz diaria del programa; sus tablas diarias pueden redondear, por lo que aquí se interpretan los resultados mensuales desde los valores numéricos, no multiplicando cifras diarias redondeadas.

## Lectura para la decisión

La misma referencia de 49.000 permite escenarios con resultados opuestos. La variable crítica es cuánto trabajo humano exige servir una cuenta y cuántas cuentas de pago activas llegan realmente. Ninguna tasa del panel sintético reemplaza esas mediciones.

Cada escenario reserva 500.000 de preparación futura; el resultado después de ese gasto inicial es -4.633.000, +768.000 y -8.558.000, respectivamente. No se valoró la inversión histórica ni se añadió presupuesto de publicidad nueva. La caja calculada tampoco prueba disponibilidad de recursos del fundador ni aprobación de inversión. Deben incorporarse CAC, cargos reales e impuestos que correspondan antes de tratarlo como plan integral.

Los informes generados incluyen precio -10 %, volumen -20 % y costos variables +15 %. Reemplazar supuestos con datos observados puede cambiar el resultado completo; preservar este ensayo como comparación.

## Condiciones financieras del board

Siguen pendientes: gasto facturado atribuible a Huella Nex, tiempo de alta y atención, horas disponibles, mecanismo de cobro y rampa sustentada en compradores externos. El escenario eficiente muestra una posibilidad aritmética; no acredita que esas condiciones se hayan cumplido. No se crea `founder/numbers.json` principal para que el compilador no convierta estas hipótesis en una aprobación general.

Antes de cobrar, un contador debe revisar identidad del prestador, estructura de costos y tratamiento tributario aplicable; esta sensibilidad no sustituye esa revisión ni constituye asesoría financiera, tributaria o jurídica.
