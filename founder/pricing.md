# Precio — mantener referencia y probar antes de cambiar

19/11/2026. Se ejecutó `van_westendorp.py` sobre las **100 respuestas completas**, sin descartes; informe original en [pricing-curve.md](pricing-curve.md). Todos los importes siguientes son COP por establecimiento-mes, no tarifas aceptadas.

## Respuestas del modelo y problema del punto óptimo

| Salida mecánica | COP |
| --- | ---: |
| PMC | 20.125 |
| OPP | 20.125 |
| IPP | 49.375 |
| PME | 99.687,50 |

Medianas del panel: demasiado barato 15.000, barato 35.000, empieza a ser caro 75.000 e inaceptablemente caro 120.000. El programa sitúa 49.000 dentro de su intervalo PMC–PME.

**No interpretar 20.125 como precio óptimo comercial.** Se comprobó que el máximo umbral de «demasiado barato» es 20.000 y el mínimo de «demasiado caro» es 100.000. Entre esos extremos ambas curvas de rechazo extremo valen cero. La función `cross` del proveedor devuelve el primer punto de esa igualdad en su rejilla, en este caso 20.125. La salida describe una meseta y depende de la discretización; no identifica un óptimo único. Las respuestas repetitivas y ancladas al precio presentado limitan todo el rango sintético, incluido IPP.

## Decisión de trabajo

Conservar **49.000 como referencia de investigación**: no hay evidencia para reducirlo, convertirlo en tarifa final o subirlo por el panel. Los 100 rechazaron comprar ahora y el motivo primario más frecuente fue confianza/preparación, no precio. Una cifra dentro de un rango sintético no reemplaza aceptación de oferta ni contribución real.

Comparadores públicos y límites: [competitors.md](competitors.md). ARCLY estética publica 49.000 y veterinaria 69.000; DogtorSoftware 61.600/73.100 mensual con IVA; otros planes cambian límites y prestaciones. No tratarlos como paquetes idénticos ni inferir el impuesto de Huella Nex por el de un rival.

## Sensibilidad económica, con demanda constante por construcción

Calculador CFO sobre el escenario acompañado, misma rampa y variable 18.000/fijo mensual 750.000 hipotéticos. No se supone que subir el precio conserve realmente esos clientes.

| Precio supuesto | Contribución por cuenta | Equilibrio, cuentas enteras/mes | Operativo año 1 |
| --- | ---: | ---: | ---: |
| 49.000 | 31.000 | 25 | -4.133.000 |
| 59.000 | 41.000 | 19 | -2.563.000 |
| 89.000 | 71.000 | 11 | 2.147.000 |

Números ejecutados mediante `unit_economics.py ... --price ... --json`. Son sensibilidad aritmética, no estimaciones de ventas por precio. Ver [CFO y supuestos](cfo.md). Falta el escenario financiero observado; no se afirma que 49.000 deje margen real suficiente ni que 89.000 tenga compradores.

## Escalones y prueba de apertura

El proyecto muestra Básico 49.000, Pro 89.000 y Personalizado por cotización. Básico y Pro comparten hoy operación; el cupo de IA propuesto no se ofrece externamente en este panel. No inventar un escalón de funciones para justificar la diferencia. Mantener la estructura como referencia del proyecto, con oferta final pendiente.

La evaluación gratuita se documenta con fechas y alcance que acepte cada participante; no hay fecha final acordada ni cobro automático. No anunciar descuentos, precio anterior ficticio o urgencia para forzar compra.

Dos precios candidatos para entrevistas reales posteriores: 49.000 y 59.000, con idéntico alcance que sea efectivamente entregable, precio total transparente y registro de la decisión. La prueba solo tiene sentido después de cerrar condiciones y encaje; no presentar 59.000 como tarifa instalada ni cobrarla desde este estudio. Comparar aceptación y pago posteriores, no «me parece barato».

## Objeciones económicas textuales del panel

Citas sintéticas, nunca testimonios:

- P001: «Los $49.000 mensuales me parecen evaluables, pero no pagaría mientras el precio final y la continuidad del servicio sigan pendientes.»
- P005: «Los $49.000 mensuales pueden ser razonables, pero no cambiaría con el soporte y las condiciones pendientes.»
- P020: «Los $49.000 mensuales no me parecen excesivos, pero todavía no veo una mejora concreta para mi pet shop que compense aprender y cambiar la forma de trabajar.»

Estado: análisis de precio completado sobre simulación y sensibilidad. Precio definitivo, costos facturados, condiciones y contraste con compradores reales permanecen pendientes.
