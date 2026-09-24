# Implementation Plan: Registro e Identificación del Paciente (HIS)

**Branch**: `001-patient-registration` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-patient-registration/spec.md`

## Summary

Construir el módulo fundacional de registro e identificación del paciente del HIS como pieza autocontenida: alta de pacientes con identidad única reutilizable (id interno + código de historia clínica), búsqueda/verificación exacta por documento o código HC, y actualización de datos personales/de contacto, con unicidad de documento y validación estricta. Enfoque técnico: aplicación web Node.js/Express con API REST + interfaz administrativa ligera, persistencia en base de datos relacional (SQLite) con constraints de unicidad a nivel de BD, y validación de entrada en la frontera. Trazabilidad: cada FR/RN del `spec.md` se referencia desde `tasks.md` (fase posterior) y desde los contratos de API.

## Technical Context

**Language/Version**: JavaScript (ESM) en Node.js 20 LTS

**Primary Dependencies**: Express 4 (web), `node:sqlite` nativo de Node (acceso relacional `DatabaseSync`; sustituto de better-sqlite3 por fallo de build nativo en Node 24/Windows — ver research R1), express-validator (validación de entrada), helmet (cabeceras seguras), uuid (identidad interna); Jest + Supertest (pruebas)

**Storage**: SQLite (base de datos relacional embebida, fichero único) — cumple el requisito de "base de datos relacional" con cero configuración, ideal para entregable ZIP autocontenido; migrable a PostgreSQL cambiando solo la capa de acceso

**Testing**: Jest + Supertest (integración de API), Jest puro (unitarias de validación/DNI), pruebas de contrato sobre los endpoints de `contracts/`

**Target Platform**: Servidor local/estándar (Windows/Linux/macOS) accesible vía navegador HTTP

**Project Type**: Web service (API REST) + frontend administrativo estático ligero servido por Express (misma app, sin build step)

**Performance Goals**: búsqueda/verificación < 2 s percibidos (SC-004), alta < 3 min usuario (SC-001); objetivos de servidor: ≤ 200 ms p95 en operaciones CRUD sobre decenas de miles de filas

**Constraints**: unicidad de documento garantizada a nivel de BD (no solo en código) para cerrar el caso de carrera (edge case de alta concurrente); identidad única inmutable (RN-001/RN-007); sin autenticación (FR-019); mensajes en español

**Scale/Scope**: decenas de miles de pacientes, 3 flujos de usuario, ~4 endpoints REST, 1 tabla principal; una única app desplegable

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` existe pero contiene únicamente el plantilla sin principios personalizados (placeholders `[PRINCIPLE_*]`). No hay principios ni gates activos que evaluar.

| Gate | Estado | Notas |
|------|--------|-------|
| Principios del constitution | N/A | Constitution sin ratificar/personalizar; no impone restricciones |
| Alineación con spec | PASS | Plan cubre FR-001..FR-020, RN-001..RN-010, SC-001..SC-008 |
| Fuera de alcance respetado | PASS | Sin auth, sin módulos de citas/HC/facturación, sin integración con aseguradoras |
| Identidad única reutilizable | PASS | Id interno (UUID) + código HC único e inmutables, expuestos en API/contratos |

**Resultado pre-Phase 0**: PASS (sin violaciones que justificar). Se re-evalúa tras Phase 1.

### Re-evaluación post-Phase 1 (tras diseño)

| Gate | Estado | Evidencia de diseño |
|------|--------|---------------------|
| Principios del constitution | N/A | Constitution sigue sin principios personalizados |
| Alineación con spec | PASS | `data-model.md` cubre entidades y reglas de FR/RN; `contracts/api.md` traza US1→POST, US2→GET search, US3→PATCH; `quickstart.md` valida SC-001..SC-008 |
| Fuera de alcance respetado | PASS | Diseño sin auth, sin tablas de citas/HC/facturación (solo FKs documentadas como futuro), sin integración con aseguradoras (solo campos de dato) |
| Identidad única reutilizable | PASS | UUID + `hc_code` UNIQUE e inmutables; endpoint `GET /api/patients/:id` como contrato de integración (FR-020, SC-008) |
| Unicidad de documento bajo concurrencia | PASS | `UNIQUE (document_normalized)` en BD (data-model §Constraints, research R4) — cierra edge case de carrera |

**Resultado post-Phase 1**: PASS — sin violaciones; `Complexity Tracking` permanece vacío.

## Project Structure

### Documentation (this feature)

```text
specs/001-patient-registration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api.md           # Contrato REST del módulo
├── checklists/
│   └── requirements.md  # Quality gate de la spec
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app.js                 # Factory de la app Express (exportable para tests)
├── server.js              # Punto de entrada HTTP
├── config/
│   └── index.js           # Puerto, ruta de BD, flags
├── db/
│   ├── connection.js      # Conexión SQLite + pragma
│   ├── schema.sql         # DDL (tabla patients, constraints, índice)
│   └── migrate.js         # Aplicación de schema (idempotente)
├── repositories/
│   └── patientRepository.js   # SQL de alta/búsqueda/actualización (única capa de BD)
├── services/
│   └── patientService.js      # Reglas de negocio: unicidad, identidad, actualización
├── validation/
│   ├── dni.js             # Algoritmo letra DNI/NIE
│   └── patientRules.js    # Reglas express-validator (alta/actualización/búsqueda)
├── routes/
│   └── patients.js        # Endpoints REST (ver contracts/api.md)
├── middleware/
│   ├── errorHandler.js    # Respuestas de error estandarizadas (ES)
│   └── validate.js        # Ejecutor de validaciones
└── public/                # Frontend administrativo estático
    ├── index.html         # Lista/busca pacientes
    ├── form.html          # Alta / edición
    ├── app.js             # Llamadas a la API
    └── styles.css

tests/
├── unit/
│   ├── dni.test.js
│   └── patientService.test.js
├── integration/
│   └── patients.api.test.js   # Supertest contra app en BD en memoria
└── contract/
    └── api.contract.test.js   # Cumple contracts/api.md

package.json
```

**Structure Decision**: Aplicación web única (opción "web service + frontend estático servido por Express"). Se descarta frontend con build step (React/Vue) por innecesario para 3 flujos y por el requisito de entregable autocontenido; se descarta monorepo backend/frontend separado porque no hay integraciones externas que lo justifiquen. La capa `repositories/` aísla el SQL para que el servicio de negocio sea testeable sin BD y para facilitar una futura migración a PostgreSQL.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Sin violaciones de constitution. No se registra nada.
