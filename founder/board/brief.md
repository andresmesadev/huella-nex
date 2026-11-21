# Brief independiente para founder-board — Huella Nex

Fecha: 19/11/2026, America/Bogota. Encargo: revisar el producto comercial, fortalezas, riesgos y condiciones para beta externa, distinguiendo evidencia de supuestos. Aplicar una sola lente publicada por memo; no suplantar ni atribuir opiniones a sus autores.

## Idea

Huella Nex es una plataforma de gestión para veterinarias, pet shops y peluquerías caninas y felinas: clientes, mascotas, agenda, atención, servicios, personal, caja, ventas e inventario según módulos, y comunicación/IA cuando estén habilitadas. Colombia es el primer mercado. Ver `founder/idea.md`.

Tarjetas del código: Básico $49.000 COP/mes y Pro $89.000 COP/mes. Hoy comparten operación; la diferencia propuesta de cupo de IA no está habilitada comercialmente. Referencias, no precio aceptado por el participante ni oferta definitiva. Personalizado se cotiza. La preparación estándar menciona un mes gratuito, pero admisión/condiciones conservan fechas y aceptación pendientes; no convertir esa mención en un acuerdo ejecutado. Sin conversión automática a pago.

Mateos Pet es el establecimiento real de Andrés y Lina y primer usuario; no es una simulación creada para el software. Nexo Web es la iniciativa de desarrollo de Andrés, aún sin constituir jurídicamente como empresa. No inventar una sociedad ni concluir que constituirla es por sí solo requisito de beta. La identidad del prestador debe ser real. Marca/dominios sin validación registral acreditada por esta revisión. No se aporta presupuesto total, horas disponibles, CAC, retención externa o pagos independientes observados.

## Fuentes rectoras leídas

- `docs/IDENTIDAD_DEL_PRODUCTO.md`: origen, identidades, operación real desde 19/10/2026, Colombia primero; nombre adoptado el 28/10.
- `docs/PLAN_MAESTRO.md`: la plataforma es el producto; IA es capacidad opcional; módulos operan sin IA; datos pertenecen al negocio; dominio y reglas preceden canales. No convertir un lanzamiento estrecho en cambio de identidad. Fases técnicas cerradas no certifican aceptación comercial. No proponer fases futuras, nueva Organización superior a Tenant, API para terceros ni cambios de código por este análisis.
- `docs/history/PHASE_1_COMPLETION_REPORT.md`, `docs/architecture/domain-model-v1.md` y `docs/PHASE_2_EXECUTION_RULE.md`: trazabilidad de precios, hechos financieros inmutables, aislamiento Tenant y diseño previo a cambios funcionales.

## Evidencias y límites

| Hecho documentado o inspeccionado | Qué acredita | Qué no acredita |
| --- | --- | --- |
| Identidad del producto registra operación real de Mateos Pet desde 19/10 | Uso en un establecimiento propio, con datos y actividad reales | Ahorro cuantificado, compra externa, adopción autónoma o encaje en tres nichos |
| Informe `docs/audits/ASSISTED_BETA_FICTIONAL_BUSINESS_TEST_20261118.md`: 37 comprobaciones de integración y 9 unitarias aprobadas | Ensayo técnico local con PostgreSQL temporal, navegador, alta, aislamiento, agenda, caja, inventario/comisiones, soporte y salida/restauración según fixtures | Aceptación humana externa, versión publicada o prueba completa del plan estándar. Reutilizó build local previo; no compiló ni desplegó. Parte del ensayo habilitó más módulos que la beta candidata |
| `docs/operations/STANDARD_PLAN_EXTERNAL_BETA_SCOPE_20261118.md`: seguimiento Básico grooming, 15 comprobaciones locales, horario general 09–17 y área 09–17:20 | Configuración estándar permitió cita 17:00; 17:20 rechazada. Se repitió caja | El límite de una mascota simultánea ni aceptación del negocio; no confundir el ensayo técnico con aprendizaje humano |
| `docs/audits/GROOMING_20_90_SCHEDULING_REVIEW_20261118.md`: 16 comprobaciones | La API permitió dos servicios de 90 minutos con misma profesional a 09:00 y 09:20; protege el bloque de recepción de 20 minutos | Que guardar duración 90 limite toda la ocupación. La nota final de alcance estándar reemplaza la aceptación anterior de superposición: requisito vigente capacidad 1 |
| Código actual `backend/src/lib/reservation-slot.js` | Comentario explícito separa recepción de duración; grooming usa 20 minutos | No se ejecutó hoy otra integración ni se verificó producción. No calificar todo solapamiento como defecto universal; es falta de encaje con el requisito de este candidato |
| Matriz de beta `docs/audits/HUELLA_NEX_EXTERNAL_BETA_READINESS_20261030.md` | BETA-01 cerrado para publicación 3.0.0; BETA-02 cerrado para recuperación 3.0.4 el 11/11; BETA-03 cerrado para ventana 48 h de 3.0.0 (577 muestras) | Estos cierres tienen versión, fecha y alcance: no son certificados perpetuos de versiones posteriores |
| `docs/operations/R2_INDEPENDENT_RECOVERY_DRILL_20261111.md` | Copia cifrada automática R2 cada 30 min y recuperación independiente aislada: 80 tablas/69 migraciones/10 lecturas. Equipo preparado, 43,742 s hasta última comprobación | RTO de producción, reconstrucción VPS/DNS/TLS ni recuperación verificada hoy. Supera la descripción antigua de falta de copia externa del documento de alcance del 28/10 |
| Matriz de admisión externa del 17/11 | Documenta 3.3.1 desplegada/verificada ese día y pide confirmar vigencia al admitir | Constatación nueva de salud, estabilidad o backup hoy |
| Inspección actual local | HEAD `ac990d5`, 18/11, versiones backend/frontend 3.3.1; el package raíz no declara versión. Hay cambios previos sin commit en recuperación, documentos y frontend | Igualdad con producción ni que cada cambio local esté revisado/publicado |

Los conteos de pruebas arriba provienen de informes fechados. No son ejecuciones nuevas del 19/11. No se suman como métricas de clientes. No se accedió a producción, contactos, fichas privadas ni datos personales para este encargo.

### Verificación adicional del 19/11 durante la revisión

`npm run lint` en frontend terminó con salida 0. La selección `node --test scripts/billing-plan-selection.test.cjs scripts/billing-suspended-access.test.cjs scripts/restore-suppression.test.cjs scripts/tenant-handover.test.cjs` terminó inicialmente con 41 aprobadas y 2 fallos `HANDOVER_FIELD_REVIEW_REQUIRED`. El diagnóstico comparó el inventario del exportador, el schema fuente y el cliente generado: este último contenía `User.archivedAt` y `Pet.archivedAt`, ausentes de la fuente. Se regeneró Prisma Client 7.10.1 desde `prisma/schema.prisma`, sin cambiar el schema ni conectar una base de datos. La misma selección terminó con salida 0: **43 pruebas, 43 aprobadas, 0 fallos**. Es evidencia local actual acotada; no añade una integración completa, revisión de producción o aceptación externa. El fallo inicial queda explicado como desfase local resuelto, no defecto comercial confirmado. Logs locales en `.cache/founder-board-20261119/`.

## Beta externa preparada y cuestiones pendientes

Fuentes: `docs/operations/EXTERNAL_GROOMING_BETA_ADMISSION_20261117.md`, `docs/operations/ASSISTED_BETA_OPERATIONAL_PREPARATION_20261118.md`, `docs/operations/STANDARD_PLAN_EXTERNAL_BETA_SCOPE_20261118.md`, `docs/operations/ASSISTED_BETA_SUPPORT_SETUP.md`, `docs/operations/SUPPRESSION_REGISTER_CUSTODY.md` y borradores `docs/legal/beta-externa/`.

- Evaluación de un negocio independiente como producto estándar Básico/Pro, sin desarrollo a medida ni excepciones por identificador. Selección exacta del plan pendiente. Alcance candidato: peluquería, agenda y caja; sin IA/WhatsApp, pet shop/inventario ni comisiones.
- Capacidad solicitada vigente: una mascota simultánea. Persisten cruces de servicios de 90 minutos. El requisito de última recepción 17:00 sí encontró configuración estándar posterior, por tanto no repetir como bloqueo pendiente.
- Plantillas y primeras filas dicen participante pendiente; un añadido posterior remite a confirmación de participación en expediente privado. No se leyó ese expediente. Distinguir interés/participación de aceptación completa de condiciones, tratamiento de datos y desempeño; estos últimos siguen pendientes en el conjunto documental.
- BETA-04/05/06/07 abiertos: condiciones/privacidad y prestador real, oferta/costos, soporte/salida efectivos y evaluación externa. Una invitación o prueba gratuita no constituye aceptación ni disposición a pagar.
- Soporte: Andrés inicial, correo del producto documentado; franja, objetivo de respuesta, alternativa/suplencia y prueba real de recepción/respuesta pendientes. No enviar mensajes por este encargo. No atribuir 24/7 ni SLA.
- Exportación, entrega cifrada, revocación y supresión elegible tienen ensayos sintéticos; falta acordar alcance real, verificar destinatario, conservación y medios. No borrar historial financiero por salida.
- Replay de supresiones tras restaurar está implementado/ensayado localmente, con cambios sin publicar; custodio/aprobación, cuentas, referencia vigente independiente y recuperación de medios reales pendientes. No declarar disponible en producción por existir el script.
- Separar tres etapas: laboratorio interno ficticio; práctica externa ficticia tras acuerdo; alta/datos reales solo al completar admisión. No trasladar datos de Mateos Pet ni cobros de demo.
- Procedimiento y ficha C1–C7 existentes (`HUELLA_NEX_EXTERNAL_BUSINESS_EVALUATION*.md`): observar alta/configuración/catálogo/primera operación/historial/cierre/contingencia; registrar tiempos, toda ayuda, incidentes y conciliación independiente. Continuación, aceptación de precio y pago son evidencias distintas. Fijar criterios antes de la prueba; no inventar minutos o umbrales como requisitos ya aprobados.

## Modelo económico y diferenciación: evidencia disponible

- `docs/research/COLOMBIA_MARKET_AI_QUOTAS_20261028.md`: investigación pública de páginas de proveedores, no ensayo de sus productos ni censo. Advierte expresamente que hay ofertas que anuncian combinar segmentos; no sostiene unicidad. Precios competidores no revalidados hoy: no presentarlos como vigentes. No afirmar ausencia de investigación competitiva.
- `docs/research/AI_CREDIT_METERING_VALIDATION_20261029.md`: costos de IA simulados con supuestos de tokens, modelos/tarifas a 29/10 y COP/USD 4.500 (estrés 6.000), sin llamadas de pago. Envolvente de Pro: ingreso referencia 89.000; solo IA 43.718,40 o 58.291,20 COP; diferencia previa a otros costos 45.281,60 o 30.708,80. No es margen neto. Excluye impuestos, VPS, backups, soporte y comisiones de pago. Tarifas/tasas NO se revalidaron hoy: si usan cifras, rotular simulación histórica, no presupuesto actual.
- No constan aquí tiempo real de soporte por cliente externo, gasto total observado por tenant, adquisición repetible, disposición de pago demostrada, retención, efecto de red, cuota o ventaja 10x medida. El conocimiento operacional propio y la integración son posibles ventajas; su defendibilidad es una hipótesis.
- `docs/decisions/033-modelo-comercial-dashboard-ia-whatsapp.md`: software+IA gestionados; negocio conecta su WhatsApp y paga Meta; sin cuenta propia de OpenAI exigida al negocio. HN-04/BETA-08 pendientes de aceptación externa y condiciones de proveedor. No confundir implementación de cupos con Meta aprobado. La beta manual no requiere este canal.
- Se consultó hoy la Ley 1581 en fuente oficial DIAN: roles de persona natural/jurídica (art. 3), finalidad/seguridad/confidencialidad (art. 4), autorización y excepciones (9–10). Usar solo para apoyar necesidad de preparación particular; no certificar cumplimiento. URL: https://normograma.dian.gov.co/dian/compilacion/docs/ley_1581_2012.htm . La consulta de documentación Embedded Signup devolvió 429; no se certificaron requisitos o estado actual de Meta.

## Encargo a cada lente

Leer este brief, `founder/idea.md` y el `lenses.md` indicado. Usar SOLO la lente asignada. Emitir Score 1–10 y voto FUND / FUND IF / PASS para invertir recursos en desarrollar Huella Nex como negocio comercial desde su estado actual; explicar aparte si admite beta ficticia, real o venta amplia. No se trata de una promesa de financiación real. Los puntajes son juicios, no probabilidades ni métricas.

Escribir en español: fortaleza, tres riesgos más peligrosos en orden, preguntas al fundador (registradas, sin interrumpir el encargo), condiciones si FUND IF. Identificar evidencia documental, inspección de código, inferencia y dato pendiente; citar fuentes locales relevantes. Preservar desacuerdos. No iniciar acciones con clientes, producción o desarrollo, no prometer fechas ni pedir nuevas funcionalidades ajenas al alcance. Un panel simulado de compradores no sustituye validación externa.
