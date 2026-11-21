# Perfil del panel — propuesta pendiente de corregir

**Actualización del 19/11:** Andrés corrigió el enfoque y confirmó incluir peluquerías, centros veterinarios, clínicas veterinarias y pet shops, con 100 compradores. El perfil vigente está en [customer.json](customer.json), con 25 escenarios por tipo. Los rangos de edad/ingreso y pesos de comportamientos son supuestos declarados, no datos de mercado. El texto inferior conserva el borrador anterior para trazabilidad y ya no es el perfil de ejecución.

## Comprador propuesto

Persona que dirige una peluquería canina/felina independiente en Colombia y decide qué software pagar para su establecimiento. Necesita registrar clientes y mascotas, coordinar citas, registrar atención/cobros y revisar caja. No confundirla con el propietario de una mascota que reserva un baño.

Tres segmentos propuestos, todavía sin pesos estadísticos:

1. Trabaja sola y lleva agenda/cuentas de forma manual.
2. Coordina un equipo pequeño y combina mensajería, calendario y hojas.
3. Ya paga otro software y necesita una razón demostrable para migrar.

Los tamaños, participaciones, edades e ingresos no están documentados. El ejemplo original de la skill es consumo individual; este caso es compra empresarial. No sustituir silenciosamente ingreso personal por ventas del negocio ni generar rangos como si se hubieran investigado. Antes de ejecutar, acordar cómo representar capacidad de pago empresarial y registrar los rangos como datos o supuestos de escenario. Las proporciones de personas sintéticas no medirán distribución real del mercado.

## Comportamientos candidatos

- Prioriza menor gasto mensual.
- Prueba tareas completas antes de cambiar.
- Necesita acompañamiento inicial.
- Se resiste a migrar su base de clientes.
- Exige control confiable de horarios.
- Compara soporte y posibilidad de recuperar sus datos.

Son escenarios para explorar, no frecuencias observadas. Deben corregirse con experiencia del fundador o entrevistas.

## Objeciones candidatas

- ¿Evita cruces según la duración y capacidad que necesito?
- ¿Puedo operarlo sin que el desarrollador haga el trabajo por mí?
- ¿Por qué cambiar frente al papel, mi agenda o mi software actual?
- ¿Qué incluye realmente la mensualidad y cuánto cuesta empezar?
- ¿Quién me ayuda y en qué horario?
- ¿Cómo recupero mis datos si dejo de usarlo?

Origen: condiciones del [board](board.md), alcance de beta y [comparación pública](competitors.md). No son citas de compradores reales ni resultados de encuestas.

## Tamaño y límites

Recomendación inicial: 20 compradores sintéticos mediante --quick. Alternativa predeterminada: 100 compradores, con 100 llamadas a subagentes. La comparación posterior de oferta contempla otras 20 llamadas. Guardar línea base y variante por separado.

Los resultados ayudan a detectar objeciones y mejorar el mensaje. No demuestran demanda, conversión, retención ni pago. Sus respuestas de precio serán hipótesis para contrastar con personas reales.
