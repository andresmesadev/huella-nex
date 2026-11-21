# Interpretación del panel de 100 compradores

19/11/2026. **0 comprarían ahora; 100 pasarían.** Se completaron y validaron las 100 respuestas, sin exclusiones. Son decisiones de agentes simulados ante el mensaje de [pitch.md](pitch.md), no entrevistas, pagos ni predicción de ventas. Los [resultados del contador original](panel/results.md) y [datos estructurados](panel/results.json) conservan la evidencia.

## Qué se probó

La compra de una suscripción manual de referencia 49.000 COP/mes para un establecimiento, con alcance, impuestos, condiciones y soporte pendientes y la preparación externa actual explicada. Todos recibieron el mismo mensaje y se distinguió pagar de aceptar una demostración gratuita. No se evaluó una oferta futura de IA/WhatsApp plenamente habilitada.

| Tipo de decisor | Respuestas | Compraría ahora | Pasaría |
| --- | ---: | ---: | ---: |
| Peluquería independiente | 25 | 0 | 25 |
| Centro veterinario | 25 | 0 | 25 |
| Clínica veterinaria | 25 | 0 | 25 |
| Pet shop | 25 | 0 | 25 |

Los seis comportamientos y los tres grupos de ingreso sintético también dieron 0 %. No hay segmento ganador ni diferencia de comportamiento que permita priorizar compradores por esta tasa. La distribución de cuatro grupos iguales es experimental; edades, ingresos y pesos son supuestos descritos en [customer.json](customer.json).

## Tres motivos principales

Cada comprador eligió un motivo primario, por lo que estos conteos sí suman 100 junto con las dos categorías restantes. Las citas siguientes proceden de agentes y nunca deben publicarse como testimonios.

1. **Confianza/condiciones de entrega: 76.** P001: «Los $49.000 mensuales me parecen evaluables, pero no pagaría mientras el precio final y la continuidad del servicio sigan pendientes.»
2. **Inercia y costo de cambiar: 11.** P005: «Ya pago un sistema y no veo todavía una mejora concreta que justifique pasar los datos y volver a aprender.»
3. **Necesidad/encaje insuficientemente demostrado: 8.** P011: «Por $49.000 podría considerar una herramienta para revisar cobros, pero todavía no veo demostrado qué parte de la operación de una clínica me resolvería.»

Otros motivos primarios: calidad percibida, 4; conveniencia, 1. Ninguno eligió precio como código primario. Esto no demuestra que 49.000 sea el precio correcto: todas las respuestas están ancladas al mismo mensaje y siguen siendo sintéticas.

## Qué dicen que cambiaría su decisión

Conteo textual reproducible sobre `would_change_my_mind`, con coincidencia de palabras clave sin distinguir mayúsculas. Las categorías se solapan: una respuesta puede contener varias; no son tasas de conversión ni codificación cualitativa independiente.

| Tema | Coincidencias de 100 | Patrón usado |
| --- | ---: | --- |
| Prueba de tareas o encaje | 96 | demostra / prueb / evaluac / tarea / recorrido / encaje / flujo |
| Soporte/cobertura | 70 | soport / horario / cobertura / franja / respuest |
| Recuperación/exportación/salida | 51 | export / recuper / respald / salida |
| Precio y condiciones | 37 | precio / impuest / condicion / contrat / costo / tarifa |
| Cambio o mejora frente a alternativa | 18 | migr / cambi / mejora / ahorr |

Ejemplo sintético P002: «Una prueba asistida que me permita completar un turno de peluquería de principio a fin y verificar la salida de los datos, con alcance y soporte por escrito.» Es una condición declarada por un agente; no asegura que compraría si se cumple.

## Límites que cambian la conclusión

El mensaje incluye varios pendientes y una preparación externa documentada solo para peluquería, aunque el producto y el panel abarcan los cuatro tipos. Esa información puede generar rechazo uniforme por preparación y ocultar diferencias de valor entre segmentos. No permite medir el atractivo de una oferta terminada ni concluir que no existe mercado.

Los agentes comparten tecnología y mensaje; cien respuestas no equivalen a cien observaciones humanas independientes. No se calculan intervalos de confianza, tamaño de mercado, probabilidad de éxito ni proyección de ventas. Los rangos de ingresos personales no son facturación ni presupuesto de compra del negocio. El resultado tampoco acredita fallos nuevos de software: reporta percepciones ante lo presentado.

## Qué corregir primero

1. Cerrar una propuesta verificable por tipo: alcance que encaja, precio total, quién responde/cuándo y salida de datos. Donde no exista encaje, reconocerlo antes de admitir al participante.
2. Observar una tarea esencial con un decisor independiente y datos ficticios, midiendo aprendizaje, ayuda y conciliación con el procedimiento ya existente. No convertir la sesión en una venta implícita.
3. Medir costo real de alta y soporte y documentar aceptación/pago por separado. Después ajustar oferta y ejecutar su comparación breve preservando esta línea base.

**Lectura sobre el futuro:** existe base operativa y conocimiento del problema según el board. El panel indica que la propuesta actual aún no genera una decisión de pago; el juicio comercial permanece condicionado a evidencia real. Bajar el precio o añadir funciones sin comprobar la causa no está justificado por esta simulación.
