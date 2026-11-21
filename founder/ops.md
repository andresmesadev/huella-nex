# Operación comercial — propuesta para validar

Corte 19/11/2026. Se aplica a software por establecimiento para los cuatro públicos confirmados; las tareas esenciales cambian por módulo. Este documento prepara decisiones y rutinas, no habilita cuentas ni modifica el producto. Costos reales y disponibilidad siguen pendientes en [cfo-sources.md](cfo-sources.md).

## Ciclo diario y responsables

1. Andrés revisa salud, incidentes y estado de respaldos antes de la franja de atención acordada. La franja todavía no está fijada.
2. Revisa solicitudes y verifica que el flujo del negocio encaje con módulos y restricciones actuales. El comprador ve esta conversación; registrar las necesidades sin prometer desarrollo incluido.
3. Para una evaluación aceptada, prepara entorno separado y tareas con datos ficticios. Registrar tiempo de configuración y enseñanza.
4. El participante ejecuta tareas esenciales; registrar toda ayuda del fundador, errores, dudas y resultado de conciliación.
5. Atiende casos según impacto y confirma identidad/facultades antes de actuar sobre datos. El comprador ve acuse y próximo contacto acordado, no un SLA inventado.
6. Cierra jornada con incidentes pendientes, trabajo/tiempo consumidos, siguiente responsable y contingencias. No modificar hechos financieros para cuadrar.

Andrés es responsable inicial según el runbook; no se asignan obligaciones a Lina u otra persona sin acuerdo. En lugar de inventar una jornada semanal, medir por separado desarrollo/mantenimiento, alta, soporte directo y captación. El CFO usa 25.000 COP/hora solo como sensibilidad, sin afirmar remuneración o disponibilidad reales.

## Proveedores y cotizaciones

Fuentes públicas consultadas el 19/11. No se contrató, migró ni cambió ningún proveedor.

| Insumo | Evidencia y comparación | Qué falta para costo integral |
| --- | --- | --- |
| Servidor actual | VPS existente documentada; [Hostinger](https://www.hostinger.com/co/vps-servidor-web) publica planes y promociones | Factura y renovación del plan realmente contratado, impuestos, duración del prepago y atribución a Huella Nex; el precio promocional no reemplaza esa factura. |
| Alternativas de servidor, si se necesitara cotizar | [DigitalOcean](https://www.digitalocean.com/pricing/droplets) publica Basic 4 GiB/2 vCPU a USD 24/mes; [Hetzner](https://www.hetzner.com/cloud/) ofrece configurador pero el extracto no entregó importe verificable | Región, recursos equivalentes, almacenamiento, transferencia, IVA/impuestos y soporte. No son cotizaciones equivalentes ni recomendación de migración. |
| Respaldo externo actual | [R2 Standard](https://developers.cloudflare.com/r2/pricing/): USD 0,015/GB-mes, operaciones A USD 4,50/millón y B USD 0,36/millón; nivel gratuito mensual sujeto a uso y condiciones | Uso total de la cuenta, GB-mes y operaciones, retención y factura. No declarar respaldo gratuito por el tamaño de una sola copia. |
| Correo, dominio y cobro | Existen buzón de soporte y diseño de cobro documentados | Recibos, renovación, titularidad operativa, recepción/respuesta real y comisiones del mecanismo de cobro que se utilice. No se localizaron importes suficientes. |
| IA y WhatsApp posteriores | Modelo comercial del ADR 033 y simulación de créditos del 29/10 | Tarifas vigentes, consumo real, aprobación/habilitación y aceptación externa. Permanecen fuera de la oferta manual evaluada. |

No introducir un helpdesk, CRM, otro proveedor de pagos o una cola nueva solo para completar esta plantilla. Reutilizar repositorio, procedimientos y registro privado de incidencias existentes. La comparación de alternativas puede continuar si aparece una necesidad concreta; no obliga a cambiar una infraestructura que ya sirve.

## Rutinas breves

### Evaluación e incorporación

1. Identificar tipo de negocio, decisor, tarea esencial y alternativa actual.
2. Explicar alcance probado y limitaciones. Para clínicas, no ofrecer historia clínica integral u hospitalización como si estuvieran incluidas; para grooming, exponer la brecha de capacidad; para pet shops, verificar el recorrido de ventas/inventario del candidato concreto.
3. Acordar evaluación ficticia y usar las fichas existentes: `docs/operations/HUELLA_NEX_EXTERNAL_BUSINESS_EVALUATION.md` y su ficha.
4. Observar tarea, ayuda, conciliación y recuperación/salida. Separar resultado técnico de aceptación humana.
5. Admitir datos reales solo al cerrar condiciones del expediente aplicable; una aceptación del panel no las cierra.

### Incidencia y continuidad

1. Registrar hora, impacto, establecimiento y solicitante acreditado; no pedir contraseñas.
2. Si hay posible acceso ajeno, pérdida o duplicación de dinero, contener el flujo afectado y preservar evidencia mínima.
3. Aplicar `HUELLA_NEX_SUPPORT_AND_EXIT_RUNBOOK.md` y `ASSISTED_BETA_SUPPORT_SETUP.md`; acordar registro alternativo.
4. Comprobar solución con fixtures cuando proceda y conciliar pendientes antes del cierre. No repetir cobros por una respuesta incierta.
5. Para restauración, seguir el procedimiento vigente y replay de supresiones; no improvisar una restauración productiva desde este estudio.

### Cierre y revisión semanal

1. Contrastar respaldos disponibles y fallos; un archivo existente no prueba restauración.
2. Totalizar minutos de soporte y alta por cuenta, incidencias por tarea y tiempos de respuesta dentro de cobertura acordada.
3. Contrastar cuentas de pago activas, ingreso neto de cargos, cancelaciones y gastos facturados.
4. Recalcular escenarios y limitar nuevas incorporaciones si el equipo no puede atender las existentes.
5. Mantener solicitudes fuera de alcance como decisiones de producto, sujetas al proceso vigente.

## Identidad, datos y trámites por verificar

Identificar al prestador real; Nexo Web sigue siendo iniciativa no constituida. No afirmar que crear una sociedad sea por sí solo requisito universal de este estudio. Revisar actividad y responsabilidades reales con contador mediante [RUT de la DIAN](https://www.dian.gov.co/impuestos/RUT/Paginas/Inicio.aspx). Usar el paquete legal y de admisión del proyecto para resolver tratamiento, facultades, confidencialidad, salida y conservación; no copiar los permisos de la veterinaria al negocio del software. La consulta a la página temática de datos personales de SIC falló con 502; ese punto no queda certificado aquí. Determinar según operación real qué seguros o contratos corresponden, sin presentarlos como obligaciones legales universales comprobadas.

## Registro inicial de riesgos

Probabilidad e impacto son categorías cualitativas propuestas, no frecuencias observadas.

| Riesgo | Probabilidad propuesta | Impacto | Respuesta |
| --- | --- | --- | --- |
| Requisito esencial sin encaje | Alta | Alto | Prueba previa por segmento; reconocer limitación o detener admisión. |
| Soporte consume la cuota | Alta | Alto | Medir minutos y contrastar CFO antes de escalar. |
| Precio/interés confundido con pago | Alta | Alto | Registrar demostración, aceptación y cobro por separado. |
| Único operador indisponible | Media | Alto | Acordar cobertura y contingencia; no prometer suplente inexistente. |
| Interrupción del servidor | Media | Alto | Seguimiento existente, registro alternativo y recuperación ensayada. |
| Copia o claves inaccesibles | Media | Alto | Custodia y recuperación independiente según documentos vigentes. |
| Exposición o acción en otro tenant | No cuantificada | Crítico | Verificar identidad/aislamiento, contener y seguir respuesta a incidentes. |
| Migración o salida incompleta | Media | Alto | Contrato de entrega, comprobación de apertura e integridad y revocación separadas. |
| Duplicación o discrepancia de caja | Media | Alto | Historia auditable, consulta de estado y conciliación; sin arreglos destructivos. |
| Prometer IA, DIAN o clínica integral sin habilitación | Alta si se comunica ambiguamente | Alto | Alcance escrito por módulo y revisión del mensaje antes de publicar. |

Pendientes operativos: costos facturados, horario y suplencia, canal probado, capacidad humana y condiciones de admisión de cada participante. Este documento cubre diseño operativo; la ejecución real sigue pendiente.
