# Evaluación de beta como producto estándar — 18/11/2026

Andrés aclaró que el negocio externo debe probar Huella Nex como un cliente de plan estándar, no como contratación Personalizada. La preparación y el acompañamiento no incluyen desarrollo a medida ni excepciones por nombre/identificador de negocio. Esta aclaración limita el alcance de los siguientes trabajos; no activa ni cobra ningún plan.

## Oferta y selección

Los identificadores actuales del código de facturación son basic y pro: Básico y Pro (no Premium). La selección comercial exacta sigue pendiente. La beta acordada usa el dashboard manual y el alcance operativo común, sin WhatsApp/IA, sin pet shop/inventario ni comisiones para este participante. No se promete IA activa por nombrar Pro ni se prueban sus derechos comerciales por haber probado la agenda.

La gratuidad de un mes no convierte automáticamente la cuenta en plan Personalizado ni autoriza conversión a pago. No se creó una cuenta ni una suscripción por esta aclaración.

## Configuración frente a cambio de software

| Necesidad | Tratamiento en la evaluación estándar |
| --- | --- |
| Nombre, horario, servicios, precios por raza y duración | Usar los campos/reglas existentes y documentar los pasos de configuración. No asumir que precio variable significa gratis |
| Solo peluquería, agenda y caja | Usar la configuración de módulos existente; no activar pet shop, inventario ni comisiones por completar la prueba |
| Inicios cada 20 minutos | Es el comportamiento de recepción de grooming comprobado; no garantiza capacidad de atención de 90 minutos |
| Capacidad solicitada de una mascota simultánea | Registrar como requisito de encaje. El comportamiento actual comprobado admite superposición a 20 minutos; no está aplicado un límite de 1 para atenciones de 90 minutos |
| Última recepción a las 17:00 inclusive | Registrar como necesidad. El listado actual termina 16:40; no añadir una excepción por este negocio |

No presentar un valor guardado en la ficha privada como ajuste activo del software. El máximo solicitado de 1 reemplaza la elección anterior de recepciones superpuestas para esta evaluación. No se presupone un ajuste existente de capacidad que no se haya comprobado.

## Criterio de decisión

1. Observar el registro y configuración que haría un cliente estándar; separar la ayuda documental del operador de cambios de código necesarios para que funcione.
2. Probar sus tareas con fixtures y permisos del alcance estándar. No usar permisos de plataforma, datos sembrados o plan custom para aparentar que el recorrido comercial estándar está cubierto. Distinguir los ensayos técnicos previos, que sí usaron preparación de fixtures, de esta aceptación pendiente.
3. Clasificar cada diferencia: configuración ya disponible; dificultad de uso; defecto respecto de lo ofrecido; o necesidad adicional no cubierta. Una necesidad no cubierta no pasa automáticamente a desarrollo Personalizado ni se promete incluida en Básico/Pro.
4. Si una regla de producto estándar necesita corrección general, justificarla y revisarla aparte con pruebas de regresión y aislamiento. Nunca cambiar silenciosamente la agenda de Mateos Pet para acomodar el piloto.
5. No aprobar capacidad 1 mientras la API admita atenciones superpuestas de 90 minutos. Definir con el usuario si el comportamiento estándar disponible le sirve, o registrar que todavía no encaja. Una limitación operativa aceptada debe quedar explícita; no es equivalente a control técnico.

## Estado

No se hicieron nuevas modificaciones al producto. La caracterización anterior continúa como evidencia del comportamiento actual, no como validación del plan completo. No se ejecutaron pruebas adicionales en este corte documental, no se creó acceso y no se tocaron datos reales. Pendiente repetir la aceptación con el recorrido estándar y resolver las brechas antes de declarar encaje.

## Horario propio de Peluquería comprobado en Básico

La fila de última recepción describe el ensayo con solo horario habitual. El seguimiento con el horario por área confirmó la configuración estándar para ofrecer las 17:00. Lunes a sábado, horario habitual 09:00–17:00 y horario propio de Peluquería 09:00–17:20. La hora de cierre marca el fin de la ventana para el bloque de recepción de 20 minutos. Domingo cerrado. Desde el panel con sesión de la administradora ficticia se guardaron ambos horarios y se creó la cita de las 17:00. El POST de las 17:20 se rechazó por quedar fuera del horario. Sigue pendiente el control automático de una mascota simultánea porque la duración de catálogo de 90 minutos todavía permite cruces. También se repitió el recorrido de caja.

El verificador local con la opción --basic-grooming pasó 15 comprobaciones. Evidencia en .cache/basic-grooming y .cache/basic-grooming-area-hours-20261118.log.
