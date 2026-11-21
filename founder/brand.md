# Marca — coherencia con la identidad ya elegida

Corte 19/11/2026. Aplicación de founder-brand a un producto existente, sin cambiar nombre, símbolo, estilos ni código. El panel final de 100 dio 0 compras y predominio de objeciones de confianza: respalda claridad y prueba de encaje como hipótesis de comunicación, no un cambio de nombre. El posicionamiento final se contrastará con personas reales; la identidad oficial ya está documentada.

## Decisiones que se conservan

**Huella Nex**, descriptor **Gestión para negocios de mascotas**, símbolo **Vínculo**, perfiles de perro y gato. Fuentes: `docs/IDENTIDAD_DEL_PRODUCTO.md`, `frontend/public/brand/README.md` y `frontend/lib/product-brand.ts`. El nombre del software no reemplaza la identidad del establecimiento que atiende al animal, ni Nexo Web representa una sociedad ya constituida.

La etapa genérica de generar diez nombres se omite deliberadamente: Andrés ya eligió y aplicó la identidad. Reabrirla no resuelve las condiciones del board. La promesa de marca debe abarcar peluquerías, centros/clínicas veterinarias y pet shops; el mensaje de una evaluación particular puede limitar sus módulos sin redefinir el producto.

## Voz y mensaje

Promesa propuesta, por contrastar: «Entiende y registra la operación de tu negocio de mascotas en un mismo lugar». No promete aumentar ingresos, eliminar todos los errores ni automatización aún no habilitada.

| Voz | Aplicación | Evitar |
| --- | --- | --- |
| Clara | Explicar qué registra cada módulo y qué está pendiente | Presentar acrónimos o controles internos como beneficio para el comprador |
| Cercana | Hablar de la jornada del negocio y acompañamiento concreto | Infantilizar al profesional o confundir al comprador con el dueño de la mascota |
| Precisa | Distinguir solicitud, aceptación, atención, cobro y soporte | Decir que un turno o pago quedó confirmado cuando solo se solicitó |

Tres líneas de comunicación para contrastar, sin reemplazar el descriptor oficial:

1. Tu agenda y tu caja, conectadas con tu operación.
2. Gestión para el día a día de tu negocio de mascotas.
3. De la atención al cobro, con registros claros.

Antes: «Una plataforma para todos los negocios». Después propuesto: «Gestiona las áreas que utiliza tu establecimiento y comprueba el recorrido con tus tareas». No afirmar que incluye todas las necesidades clínicas u operativas.

## Sistema visual existente

`frontend/app/globals.css` ya declara verde #137568, texto #1b353b y fondo #f5f8f8. Cálculo de luminancia relativo de los pares opacos:

| Texto / fondo | Relación | Texto normal AA, umbral 4,5:1 |
| --- | ---: | --- |
| #ffffff / #137568 | 5,57:1 | Cumple para ese par |
| #1b353b / #f5f8f8 | 12,15:1 | Cumple para ese par |
| #1b353b / #ffffff | 12,97:1 | Cumple para ese par |

El cálculo de tres pares no equivale a una auditoría completa de accesibilidad: faltan estados, transparencias, foco, controles y modo oscuro. No se modificó interfaz.

`frontend/app/layout.tsx` usa Geist y Geist Mono. Conservar Geist como tipografía de títulos y lectura; Mono queda para datos donde ayude. La [licencia pública de Geist en Google Fonts](https://github.com/google/fonts/blob/main/ofl/geist/OFL.txt) declara SIL OFL 1.1; conservar las condiciones de distribución. El primer enlace intentado a LICENSE del repositorio original devolvió 404; no se consideró prueba de ausencia de licencia.

El símbolo existente debe seguir funcionando sobre fondo claro/oscuro y a tamaño de icono; conservar nombre como texto accesible mediante el componente común. No se generó un logo nuevo ni se copiaron activos de competidores.

## Cinco puntos de contacto

1. Presentación: nombre, descriptor, alcance manual, precio de referencia y disponibilidad por confirmar.
2. Demostración: datos ficticios, recorrido propio de cada segmento y límites visibles.
3. Propuesta: prestador real, plan, precio total, cobertura y condiciones aceptadas.
4. Comprobante: el negocio que presta el servicio al animal conserva su identidad; distinguir ese cobro de la suscripción del software.
5. Soporte y salida: lenguaje concreto, solicitante acreditado y próximo contacto acordado.

## Comprobaciones registrales pendientes

La adopción del nombre no acredita registro de marca, disponibilidad de dominio ni handles. La búsqueda oficial de [SIPI/SIC](https://sipi.sic.gov.co/) no pudo completarse por límite de redirecciones; el acceso alternativo consultado tampoco estuvo disponible. No se declara libre ni registrada Huella Nex. Falta revisión marcaria en las clases y mercados que determine un profesional, y comprobación de dominios/handles antes de cualquier registro. No se reservaron nombres ni se inició trámite alguno.

Esta etapa entrega coherencia y evidencia visual acotada. El ajuste final del posicionamiento y los controles registrales siguen abiertos.
