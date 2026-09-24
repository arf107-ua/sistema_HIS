---
description: "Task list template for feature implementation"
---

# Tasks: Gestión de Citas Médicas

**Input**: Design documents from `/specs/002-gestion-citas/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Revisar e inicializar dependencias de base de datos y Express si es necesario en `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T002 Implementar el esquema SQL (tablas de Citas, Agendas y Bloqueos) en `src/db/schema.sql`
- [x] T003 [P] Configurar el archivo central de base de datos (conexiones/pools) si no está centralizado.
- [x] T004 Asegurar que el middleware de sesión y la identidad del paciente (Práctica 1) están disponibles en `src/app.js`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Reserva de Cita Online (Priority: P1) 🎯 MVP

**Goal**: Buscar y reservar citas online.

**Independent Test**: Buscar huecos, reservar uno y validar en BD que la cita existe vinculada al ID de paciente.

### Implementation for User Story 1

- [x] T005 [P] [US1] Crear `src/models/appointmentModel.js` con métodos para consultar disponibilidad y crear cita
- [x] T006 [P] [US1] Implementar el controlador en `src/controllers/appointmentController.js` para los endpoints GET (búsqueda) y POST (reserva)
- [x] T007 [US1] Definir rutas en `src/routes/appointmentRoutes.js` y montarlas en `src/app.js`
- [x] T008 [US1] Implementar la interfaz de usuario de búsqueda y reserva en `src/public/index.html` y lógica en `src/public/js/appointments.js`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Reprogramación y Cancelación Segura (Priority: P1)

**Goal**: Permitir la cancelación o reprogramación atómica segura.

**Independent Test**: Abortar una reprogramación en curso y confirmar que la cita original sigue activa y sin cambios.

### Implementation for User Story 2

- [x] T009 [P] [US2] Agregar lógica transaccional de reprogramación (actualización atómica) y cancelación a `src/models/appointmentModel.js`
- [x] T010 [P] [US2] Agregar métodos de edición y borrado en `src/controllers/appointmentController.js`
- [x] T011 [US2] Agregar endpoints PUT y DELETE en `src/routes/appointmentRoutes.js`
- [x] T012 [US2] Extender el frontend en `src/public/index.html` y `src/public/js/appointments.js` para mostrar citas actuales y permitir su modificación

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Gestión de Agenda del Especialista (Priority: P2)

**Goal**: Bloqueo de franjas y ajuste de la duración de citas.

**Independent Test**: Bloquear una fecha por vacaciones y validar que no aparezca en los resultados de disponibilidad de un paciente.

### Implementation for User Story 3

- [x] T013 [P] [US3] Crear `src/models/scheduleModel.js` para crear reglas de bloqueos y configuración de especialista
- [x] T014 [P] [US3] Crear `src/controllers/scheduleController.js` para administrar configuraciones
- [x] T015 [US3] Crear `src/routes/scheduleRoutes.js` y montarlas en `src/app.js`
- [x] T016 [US3] Actualizar la consulta de disponibilidad en `src/models/appointmentModel.js` para excluir las fechas bloqueadas por `scheduleModel`
- [x] T017 [US3] Crear la vista de administración en `src/public/index.html` y su lógica en `src/public/js/schedules.js`

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T018 Mejorar el manejo de errores del lado del cliente (alertas de interfaz) cuando fallan las reservas.
- [x] T019 Refactorizar la validación de solapamiento de horas a nivel de base de datos o modelo.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup.
- **User Stories (Phase 3+)**: Depend on Foundational.

### User Story Dependencies
- **User Story 1**: Depends on Foundational.
- **User Story 2**: Depends on User Story 1 (needs existing appointments to modify).
- **User Story 3**: Independent of US1/US2 for configuration, but US1 searching needs to integrate US3's rules (Task T016).
