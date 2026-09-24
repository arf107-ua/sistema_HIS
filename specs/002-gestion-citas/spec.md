# Especificación de Funcionalidad: Gestión de Citas Médicas

**Rama de Funcionalidad**: `002-gestion-citas`

**Creado**: 2026-09-24

**Estado**: Borrador

**Entrada**: User description: "/speckit-specify Actúa como un analista de software experto..."

## Objetivo y Contexto de Negocio
El módulo de programación de citas médicas forma parte del Sistema de Información de Gestión Hospitalaria (HIS). Su propósito es proporcionar una herramienta centralizada y eficiente para la gestión de agendas médicas, permitiendo a los pacientes reservar, cancelar o reprogramar citas de manera autónoma, y al personal administrativo o especialistas gestionar la disponibilidad de sus horarios. Este módulo reutilizará la identidad única del paciente generada en el módulo de registro anterior (Práctica 1).

## Usuarios
- **Paciente**: Usuario registrado previamente en el sistema (con identidad única) que accede para autogestionar sus citas (búsqueda, reserva, reprogramación, cancelación).
- **Personal Administrativo / Especialista**: Usuario encargado de configurar la agenda médica, bloqueando franjas horarias por vacaciones, bajas o ajustando la duración estándar de los huecos para la atención.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Reserva de Cita Online (Prioridad: P1)
Como Paciente, quiero buscar citas disponibles por especialidad y centro, para poder reservar un hueco que se ajuste a mi horario.

**Por qué esta prioridad**: Es el flujo principal que permite la generación de valor directo al paciente al concretar la atención médica.

**Prueba Independiente**: Se puede probar realizando una búsqueda de disponibilidad y verificando que el hueco seleccionado se asigna correctamente al identificador único del paciente.

**Escenarios de Aceptación**:
1. **Dado** un paciente autenticado (con identidad única válida) y una especialidad seleccionada, **Cuando** solicita disponibilidad para un centro específico, **Entonces** el sistema muestra los huecos libres.
2. **Dado** que se muestran huecos libres, **Cuando** el paciente selecciona uno y confirma, **Entonces** la cita queda reservada y el hueco se marca como ocupado en la agenda.

---

### Historia de Usuario 2 - Reprogramación y Cancelación Segura (Prioridad: P1)
Como Paciente, quiero cancelar o reprogramar una cita existente, sin perder mi cita original hasta que se confirme la nueva.

**Por qué esta prioridad**: Evita que un paciente se quede sin atención médica si el proceso de cambio falla, se interrumpe o cancela accidentalmente.

**Prueba Independiente**: Puede probarse iniciando un cambio de cita, abandonando el proceso a la mitad, y comprobando que la cita original sigue intacta en el sistema.

**Escenarios de Aceptación**:
1. **Dado** que el paciente tiene una cita confirmada, **Cuando** selecciona la opción de reprogramar y busca nueva disponibilidad, **Entonces** la cita original sigue reservada.
2. **Dado** un proceso de reprogramación en curso, **Cuando** el paciente confirma la nueva cita, **Entonces** el sistema libera la cita original y confirma la nueva de forma atómica.
3. **Dado** que el paciente tiene una cita, **Cuando** selecciona cancelar y confirma, **Entonces** la cita se cancela y el hueco vuelve a estar disponible.

---

### Historia de Usuario 3 - Gestión de Agenda del Especialista (Prioridad: P2)
Como Personal Administrativo, quiero bloquear franjas horarias y ajustar la duración de los huecos para reflejar las vacaciones o bajas de los especialistas.

**Por qué esta prioridad**: Es necesario para que la disponibilidad que ven los pacientes sea real y no genere conflictos operativos ni dobles reservas o citas en periodos inhábiles.

**Prueba Independiente**: Puede probarse configurando un bloqueo en una agenda vacía y comprobando que esos huecos ya no se ofertan en la búsqueda de los pacientes.

**Escenarios de Aceptación**:
1. **Dado** el calendario de un especialista, **Cuando** el administrativo bloquea una semana por vacaciones, **Entonces** ninguna cita puede ser reservada en esa franja por los pacientes.
2. **Dado** la configuración de un especialista, **Cuando** se ajusta la duración de la consulta a 30 minutos, **Entonces** los huecos disponibles reflejan esa nueva duración para futuras reservas.

### Casos Límite
- ¿Qué ocurre si dos pacientes intentan reservar el mismo hueco exacto al mismo tiempo? (El sistema debe garantizar la concurrencia, asignando la cita solo al primero que confirma y notificando al otro).
- ¿Qué sucede si se bloquea por baja una franja horaria en la que ya existían citas confirmadas? (El sistema debe notificar al personal o a los pacientes, dejando las citas en estado "requiere reprogramación" y bloqueando el hueco para futuras reservas).

## Requisitos *(obligatorio)*

### Requisitos Funcionales
- **FR-001**: El sistema DEBE permitir a los pacientes buscar citas filtrando por especialidad, centro médico y fechas disponibles.
- **FR-002**: El sistema DEBE garantizar que toda reserva, modificación o cancelación de cita esté estrictamente asociada a la identidad única del paciente (creada en el módulo de registro).
- **FR-003**: El sistema DEBE permitir iniciar un flujo de reprogramación manteniendo el bloqueo y estado de la cita original hasta la confirmación final de la nueva cita.
- **FR-004**: El sistema DEBE permitir al personal administrativo configurar bloqueos en la agenda por motivos de vacaciones, enfermedad o baja.
- **FR-005**: El sistema DEBE permitir establecer o ajustar la duración base de los huecos de atención en la agenda de cada especialista.

### Reglas de Negocio
- **BR-001**: Un paciente no puede tener dos citas activas para la misma especialidad en el mismo día.
- **BR-002**: Las reprogramaciones y cancelaciones por parte del paciente solo están permitidas hasta cierto margen de tiempo (ej. 24 horas) antes del inicio de la cita.
- **BR-003**: La transacción de reprogramación debe ser atómica; si hay un fallo de red o el usuario cancela, se retiene la cita original sin modificaciones.

### Entidades Clave
- **Paciente (identidad reutilizada)**: Referencia a la identidad única validada en el módulo de registro previo.
- **Cita Médica**: Representa la reserva. Atributos: ID Cita, ID Paciente, ID Especialista, ID Centro, Fecha y Hora, Estado (Confirmada, Cancelada, Reprogramada).
- **Agenda / Bloqueo**: Representa la disponibilidad de un especialista. Atributos: Rango de fechas, ID Especialista, Motivo, Duración de intervalos.

## Criterios de Aceptación (Éxito) *(obligatorio)*

### Resultados Medibles
- **SC-001**: El 100% de las citas reservadas están correctamente vinculadas a la identidad única del paciente del sistema de registro.
- **SC-002**: En casos donde se inicia pero no se completa una reprogramación, la retención de la cita original es del 100%.
- **SC-003**: Las búsquedas de disponibilidad retornan resultados precisos (excluyendo periodos bloqueados) consistentemente.
- **SC-004**: Las modificaciones a la duración de los intervalos de atención solo afectan a la disponibilidad futura, sin alterar citas ya programadas.

## Fuera de Alcance *(obligatorio)*
Quedan explícitamente excluidos de este módulo y de su implementación:
- La historia clínica de los pacientes.
- La prescripción de medicamentos y recetas.
- La facturación o integración con pasarelas de pago.
- La gestión compleja de roles y permisos.
- Integraciones reales con aseguradoras u otros sistemas de salud externos.

## Suposiciones
- Se asume que el módulo de registro de pacientes (001-patient-registration) provee la identidad y sesión activa del paciente.
- La gestión de especialidades, especialistas y centros médicos está pre-cargada o disponible a través de datos maestros simples, sin requerir su propio módulo completo de administración (CRUD) dentro del alcance de esta práctica.
