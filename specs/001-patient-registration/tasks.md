---

description: "Task list template for feature implementation"
---

# Tasks: Registro e Identificación del Paciente (HIS)

**Input**: Design documents from `/specs/001-patient-registration/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: Included — plan.md define explícitamente la estrategia de pruebas (Jest + Supertest: unit / integration / contract) y quickstart.md los referencia como parte de la validación.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (según Project Structure de plan.md)
- Paths ajustados a la estructura real definida en plan.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project directory structure per plan.md: `src/{config,db,repositories,services,validation,routes,middleware,public}`, `tests/{unit,integration,contract}`, `data/`
- [X] T002 Initialize Node.js project in `package.json` with dependencies: express, node:sqlite (nativo), express-validator, helmet, uuid; dev: jest, supertest (research R1, R6, R8)
- [X] T003 [P] Configure npm scripts in `package.json`: `start` (node src/server.js), `migrate` (node src/db/migrate.js), `test` (jest), `reset-db`
- [X] T004 [P] Configure Jest in `jest.config.js`: testEnvironment node, roots `tests/`, sequential DB tests
- [X] T005 [P] Create environment config in `src/config/index.js`: `PORT` (default 3000), `DB_PATH` (default `data/his.db`, override `:memory:` para tests)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**?? CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create relational schema in `src/db/schema.sql` con las constraints de data-model.md verbatim: `id TEXT PRIMARY KEY`, `hc_code TEXT NOT NULL UNIQUE`, `document_normalized TEXT NOT NULL UNIQUE`, `CHECK (document_type IN ('DNI','NIE','OTHER'))`, `CHECK (insurance_number IS NOT NULL AND trim(insurance_number) <> '')`, campos obligatorios `first_name`/`last_name` no vacíos, tabla `sequences` (`name` PK, `value`), índices en (`last_name`,`first_name`)
- [X] T007 Create SQLite connection in `src/db/connection.js` con node:sqlite DatabaseSync y pragmas `foreign_keys=ON`, `journal_mode=WAL`
- [X] T008 Create idempotent migration runner in `src/db/migrate.js` que aplica `src/db/schema.sql` e inserta la fila de secuencia `hc_code` si no existe
- [X] T009 [P] Implement DNI/NIE validation in `src/validation/dni.js`: DNI `8 dígitos + letra (TRWAGMYFPDXBNJZSQVHLCKE)`, NIE `[XYZ] + 7 dígitos + letra` (X→0,Y→1,Z→2), OTHER alfanumérico 5–20 con letra y dígito; exporta `normalizeDocument()` (mayúsculas, sin espacios) — research R3, FR-003
- [X] T010 [P] Create shared validation chains in `src/validation/patientRules.js` según data-model.md: `firstName` 1–80, `lastName` 1–120, `phone` `^[+0-9()\-\s]{7,20}$`, `email` ≤120 formato email si presente, `birthDate` fecha no futura, `insuranceNumber` 1–40, `documentNumber` vía `dni.js`, `hcCode` `^HC-\d{6}$` case-insensitive
- [X] T011 [P] Create error handler in `src/middleware/errorHandler.js` con envelope de contracts/api.md: `{ error: { code, message, details? } }` y códigos `VALIDATION_ERROR` (400), `INVALID_SEARCH_CRITERIA` (400), `REQUIRED_FIELD_EMPTY` (400), `PATIENT_NOT_FOUND` (404), `DOCUMENT_ALREADY_REGISTERED` (409); mensajes en español
- [X] T012 [P] Create validation executor in `src/middleware/validate.js` que ejecuta cadenas de `patientRules.js` y delega en `errorHandler`
- [X] T013 Create Express app factory in `src/app.js`: JSON body limit 100KB, `express.static('src/public')`, `GET /api/health` → 200 `{ "status": "ok" }` (contrato §5), errorHandler al final — research R9
- [X] T014 Create HTTP entrypoint in `src/server.js` que importa `src/app.js` y escucha en `config.PORT`
- [X] T015 [P] Create shared stylesheet in `src/public/styles.css` (estilos base de la UI administrativa, español)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Alta de paciente con identidad única (Priority: P1) ?? MVP

**Goal**: Registrar un nuevo paciente con datos personales + nº seguro/mutua y recibir identidad única inmutable (id UUID + `hcCode` `HC-NNNNNN`), rechazando duplicados de documento — FR-001..FR-006, RN-001..RN-003

**Independent Test**: `POST /api/patients` con payload válido → 201 con `id` y `hcCode`; repetir mismo documento → 409; payload inválido → 400 sin crear registro (quickstart E1–E3)

### Tests for User Story 1 ?? (requested by plan.md testing strategy)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T016 [P] [US1] Unit tests DNI/NIE válidos e inválidos en `tests/unit/dni.test.js` (letra correcta/errónea, NIE XYZ, OTHER 5–20, normalización mayúsculas/espacios) — FR-003
- [X] T017 [P] [US1] Unit tests de creación en `tests/unit/patientService.test.js`: identidad única generada, `hcCode` formato `HC-\d{6}`, rechazo de duplicado, campos obligatorios (firstName, lastName, documentNumber, insuranceNumber) — FR-002, FR-004, RN-003
- [X] T018 [US1] Integration test alta completa en `tests/integration/patients.api.test.js`: E1 201 con identidad, E2 409 duplicado, E3 400 validación sin registro (BD limpia entre tests con `DB_PATH=:memory:`) — US1.1–1.3, SC-002, SC-007
- [X] T019 [P] [US1] Contract test `POST /api/patients` in `tests/contract/api.contract.test.js`: estados 201/400/409 y forma del envelope de error según contracts/api.md §1

### Implementation for User Story 1

- [X] T020 [US1] Implement identity generation in `src/services/patientService.js`: UUID v4 para `id` (research R2); secuencia `hc_code` con `UPDATE sequences ... RETURNING value` en transacción `BEGIN IMMEDIATE` → `HC-` + `padStart(6,'0')`; `createdAt`/`updatedAt` UTC
- [X] T021 [US1] Implement create in `src/repositories/patientRepository.js`: INSERT con `document_normalized` normalizado; capturar violación `UNIQUE (document_normalized)` → error de dominio `DOCUMENT_ALREADY_REGISTERED` (research R4)
- [X] T022 [US1] Implement alta flow in `src/services/patientService.js`: validar con reglas de data-model.md, normalizar documento, llamar repository, devolver Patient JSON completo (contracts §Resource)
- [X] T023 [US1] Implement `POST /api/patients` in `src/routes/patients.js` con `validate(patientRules.create)` → 201 + body Patient (FR-006)
- [X] T024 [US1] Mount patient router in `src/app.js` bajo `/api/patients`
- [X] T025 [US1] Create registration form in `src/public/form.html`: campos de contracts §1 (obligatorios marcados: nombre, apellidos, documento, nº seguro), mensajes de éxito con `id`/`hcCode` y errores 400/409 en español
- [X] T026 [P] [US1] Implement `createPatient()` fetch in `src/public/form.js` para enviar el alta a `POST /api/patients`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (E1–E3 del quickstart)

---

## Phase 4: User Story 2 - Búsqueda y verificación de identidad (Priority: P2)

**Goal**: Buscar paciente por documento exacto o `hcCode` exacto y devolver una única identidad verificable; sin coincidencia → lista vacía sin error de sistema — FR-007..FR-012, RN-004, RN-005

**Independent Test**: Con paciente dado de alta en E1: `GET /api/patients/search?document=12345678z` y `?hcCode=HC-000001` → 200 array con 1 paciente y mismo `id`; sin coincidencia → 200 `[]`; sin criterio o ambos → 400 (quickstart E4–E7)

### Tests for User Story 2 ?? (requested by plan.md testing strategy)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T027 [P] [US2] Integration tests de búsqueda en `tests/integration/patients.api.test.js`: E4 por documento (case-insensitive), E5 por hcCode mismo `id` que E4, E6 no coincidencia 200 `[]`, E7 sin criterio/ambos → 400 `INVALID_SEARCH_CRITERIA` — FR-007..FR-011, RN-005, SC-005
- [X] T028 [P] [US2] Contract test `GET /api/patients/search` y `GET /api/patients/:id` en `tests/contract/api.contract.test.js`: array de 0..1 Patient, envelope 400/404 según contracts/api.md §2–§3

### Implementation for User Story 2

- [X] T029 [US2] Implement search reads in `src/repositories/patientRepository.js`: `findByNormalizedDocument(doc)`, `findByHcCode(hc)` con SELECT exacto (índices UNIQUE) — RN-004, FR-012
- [X] T030 [US2] Implement search + getById in `src/services/patientService.js`: normalizar criterio, exigir exactamente uno de `document`/`hcCode` (si no → `INVALID_SEARCH_CRITERIA`), devolver array 0..1 y Patient por `id` — FR-009..FR-011
- [X] T031 [US2] Implement `GET /api/patients/search` y `GET /api/patients/:id` in `src/routes/patients.js` — contracts §2–§3
- [X] T032 [US2] Create search page in `src/public/index.html`: input único documento **o** hcCode, botón buscar, resultados con `id`, `hcCode`, nombre, documento, contacto; estados "no encontrado" y validación en español — US2.1–2.5
- [X] T033 [P] [US2] Implement `searchPatient()` fetch in `src/public/app.js` para `GET /api/patients/search`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently (E1–E7)

---

## Phase 5: User Story 3 - Modificación y actualización de datos (Priority: P3)

**Goal**: Actualizar parcialmente datos personales/de contacto con validación idéntica al alta, preservando `id`/`hcCode`/`createdAt` inmutables y completando opcionales vacíos — FR-013..FR-018, RN-006, RN-007

**Independent Test**: `PATCH /api/patients/:id` con teléfono/email/nuevos → 200 y valores visibles en siguiente GET con mismo `id`/`hcCode`; email inválido → 400 sin cambios previos; id inexistente → 404 (quickstart E8–E11)

### Tests for User Story 3 ?? (requested by plan.md testing strategy)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T034 [P] [US3] Integration tests de actualización en `tests/integration/patients.api.test.js`: E8 PATCH contacto 200, E9 completar email opcional, E10 email inválido 400 y datos previos intactos (SC-007), E11 id inexistente 404, inmutabilidad de `id`/`hcCode`/`createdAt` — FR-013..FR-018, SC-003, SC-006
- [X] T035 [P] [US3] Contract test `PATCH /api/patients/:id` in `tests/contract/api.contract.test.js`: 200 Patient actualizado, 400 `REQUIRED_FIELD_EMPTY`/`VALIDATION_ERROR`, 404, 409 por documento colisionante según contracts/api.md §4

### Implementation for User Story 3

- [X] T036 [US3] Implement update in `src/repositories/patientRepository.js`: UPDATE dinámico de campos enviados + `updated_at`; si cambia `documentNumber` recalcular `document_normalized` con UNIQUE (colisión → 409)
- [X] T037 [US3] Implement update flow in `src/services/patientService.js`: validar solo campos presentes con reglas del alta (FR-015), rechazar vaciado de obligatorios → `REQUIRED_FIELD_EMPTY` (FR-018), ignorar `id`/`hcCode`/`createdAt` del body (FR-016, RN-007), 404 si id inexistente (FR-017)
- [X] T038 [US3] Implement `PATCH /api/patients/:id` in `src/routes/patients.js` con `validate(patientRules.update)` → 200 Patient
- [X] T039 [US3] Add edit mode to `src/public/form.html`: cargar paciente por `id`, pre-rellenar formulario, enviar PATCH, mostrar confirmación/errores; no mostrar campos ineditables (`id`, `hcCode`) como editables — US3.1–US3.4
- [X] T040 [P] [US3] Implement `updatePatient()` fetch in `src/public/form.js` para `PATCH /api/patients/:id`

**Checkpoint**: All user stories should now be independently functional (E1–E13)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T041 [P] Add security hardening in `src/app.js`: `helmet()`, límite body 100KB, sin headers que filtren versión — research R9
- [X] T042 [P] Escape de datos al pintar resultados en `src/public/app.js` (textContent/escape) para evitar XSS con nombres/direccionales de pacientes — R9
- [X] T043 Run full test suite `npm test` y corregir fallos hasta verde (unit + integration + contract) — **56/56 en verde**
- [X] T044 Execute quickstart.md validation scenarios E1–E13 manuales/curl contra servidor local y verificar tabla SC-001..SC-008 — E1–E13 verificados (incluida carrera E13: 201+409)
- [X] T045 [P] Create root `README.md`: arranque (`npm install`, `npm run migrate`, `npm start`), URL UI, endpoints resumidos, enlaces a spec/plan/tasks
- [X] T046 Final traceability audit: matriz FR-001..FR-020 / RN-001..RN-010 ↔ tareas cumplidas; confirmar Out of Scope sin implementar (sin auth, sin módulos extra, sin integración aseguradoras) — audit OK
- [X] T047 Package deliverable: verificar árbol final igual a Project Structure de plan.md y preparar ZIP `ejercicio1_DNI(con letra).zip` con spec.md, plan.md, tasks.md y código — ZIP creado (renombrar con DNI real del alumno)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion
  - Recommended order by priority: US1 (P1) → US2 (P2) → US3 (P3)
  - US2 y US3 pueden avanzar en paralelo con US1 si se reparte equipo (comparten ficheros `patientService.js`/`patientRepository.js`/`routes/patients.js`: coordinar merges o seguir orden secuencial)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Datos de prueba provienen de US1 pero el código es independiente (servicio/repo propios); testeable con fixture de alta directa en BD
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Requiere un paciente existente para pruebas (fixture), no depende del código de US1/US2 más allá de la entidad compartida ya creada en Foundational (schema)

### Within Each User Story

- Tests written FIRST and FAIL before implementation
- Repository (modelo/SQL) before service
- Service before routes/endpoint
- Endpoint before UI
- Core implementation before integration tests go green
- Story complete before moving to next priority

### Parallel Opportunities

- Setup: T003, T004, T005 en paralelo
- Foundational: T009–T012 y T015 en paralelo (ficheros distintos); T006–T008 secuenciales entre sí (schema→connection→migrate)
- US1: T016–T019 tests en paralelo antes de implementar
- US2: T027 y T028 en paralelo; T032/T033 UI en paralelo con T029–T031 backend
- US3: T034 y T035 en paralelo; T039/T040 UI en paralelo con T036–T038 backend
- Polish: T041, T042, T045 en paralelo

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (first):
Task: "Unit tests DNI/NIE in tests/unit/dni.test.js"
Task: "Unit tests creación en tests/unit/patientService.test.js"
Task: "Contract test POST /api/patients in tests/contract/api.contract.test.js"

# Then implementation (sequential por dependencia repo→service→route):
Task: "create in src/repositories/patientRepository.js"
Task: "identity generation + alta flow in src/services/patientService.js"
Task: "POST /api/patients in src/routes/patients.js"

# UI in parallel with backend once contract is fixed:
Task: "Registration form in src/public/form.html"
Task: "createPatient() fetch in src/public/app.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart E1–E3 + `npm test` en verde para US1
5. Demo: alta de paciente vía UI/curl con identidad única visible

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test E1–E3 → **MVP entregable**
3. US2 → test E4–E7 → búsqueda/verificación operativa
4. US3 → test E8–E11 → actualización operativa
5. Polish → E12–E13, seguridad, README, ZIP — entrega final

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1, prioridad)
   - Developer B: User Story 2 (P2) sobre fixtures propios
   - Developer C: User Story 3 (P3) sobre fixtures propios
3. Merge coordinado en ficheros compartidos (`patientService.js`, `patientRepository.js`, `routes/patients.js`)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable (criteria en cada fase)
- Tests fail before implementing (red-green)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

## Task Count Summary

| Phase | Tasks | IDs |
|-------|-------|-----|
| 1. Setup | 5 | T001–T005 |
| 2. Foundational | 10 | T006–T015 |
| 3. US1 (P1) | 11 | T016–T026 |
| 4. US2 (P2) | 7 | T027–T033 |
| 5. US3 (P3) | 7 | T034–T040 |
| 6. Polish | 7 | T041–T047 |
| **Total** | **47** | T001–T047 |
