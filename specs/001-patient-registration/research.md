# Research: Registro e Identificación del Paciente (HIS)

**Feature**: 001-patient-registration | **Date**: 2026-09-22 | **Plan**: [plan.md](./plan.md)

Fase 0 del plan. Resuelve todas las incógnitas del Technical Context y documenta las decisiones de tecnología con alternativas consideradas.

## R1 — Motor de base de datos relacional

**Decision**: SQLite embebido. Motor originalmente `better-sqlite3`; en implementación se sustituyó por el módulo nativo **`node:sqlite`** (`DatabaseSync`, incluido en Node ≥ 22) porque no había binarios precompilados para Node 24 en Windows y la compilación nativa falló en el entorno — misma BD relacional, mismas constraints UNIQUE, cero dependencias nativas.

**Rationale**:
- El enunciado exige "base de datos relacional": SQLite lo es (SQL, constraints, transacciones, integridad referencial).
- Cero configuración: el entregable ZIP funciona con `npm install && npm start` sin servidor de BD externo.
- Las constraints `UNIQUE` se evalúan dentro de la BD, lo que cierra de forma fiable el edge case de alta concurrente con el mismo documento (spec → Edge Cases).
- Fácil migración futura a PostgreSQL: todo el SQL vive en `patientRepository.js` + `schema.sql`.

**Alternatives considered**:
- *PostgreSQL/MySQL*: más "production-grade", pero exige servicio externo, credenciales y pasos de instalación adicionales que rompen el criterio de entregable autocontenido de la práctica.
- *MySQL embebido / PG en Docker*: añade dependencia de Docker al correcto de la práctica.
- *ORM (Sequelize/Prisma)*: capa extra de complejidad y generación de cliente; innecesaria para una tabla y 4 operaciones. SQL explícito es más trazable a la spec.

## R2 — Identidad única del paciente (id interno + código HC)

**Decision**:
- **Id interno**: UUID v4 (`uuid`), columna `id TEXT PRIMARY KEY`, inmutable y no editable (RN-007).
- **Código de historia clínica**: formato `HC-` + número correlativo de 6 dígitos (`HC-000001`), generado en transacción con una tabla secuencial `sequences`.

**Rationale**:
- UUID como PK hace que la identidad sea única sin coordinación central y estable desde el alta (SC-003); otros módulos del HIS pueden referenciarla sin riesgo de colisión.
- El código HC legible y secuencial satisface FR-002/FN de Assumptions ("prefijo HC- más número correlativo") y facilita la verificación humana en recepción (US2).
- La generación secuencial dentro de transacción con `BEGIN IMMEDIATE` (SQLite) serializa la asignación y evita códigos duplicados bajo concurrencia.

**Alternatives considered**:
- *Solo numérico autoincremental como id*: expone volumen de altas y es peor clave de integración distribuida; se descarta como id único (aún así sirve de orden secuencial para el código HC).
- *Código HC = id interno*: menos legible para personal administrativo.
- *UUID como código HC*: no legible, no correlativo, contraintuitivo en recepción.
- *Prefijo con fecha (`HC-2026-000001`)*: añade complejidad sin requerimiento que lo pida.

## R3 — Validación del documento de identidad (DNI/NIE)

**Decision**: Algoritmo oficial del DNI español (resto de `n mod 23` → tabla `TRWAGMYFPDXBNJZSQVHLCKE`) y del NIE (prefijo X/Y/Z mapeado a 0/1/2 antes del cálculo). Normalización: mayúsculas y sin espacios antes de comparar/almacenar. Se admite además documento alfanumérico libre de 5–20 caracteres para pasaporte u otros (Assumptions del spec).

**Rationale**:
- FR-003 exige validar el formato del documento; la letra de control es la validación realista para DNI/NIE (Assumptions del spec).
- Normalización mayúsculas/espacios implementa RN-002 (comparación sin distinguir mayúsculas).
- El spec no restringe a DNI/NIE; admitir otros documentos evita bloquear altas legítimas (caso límite: pasaporte).

**Alternatives considered**:
- *Validar solo longitud 8/9*: deja pasar DNIs con letra errónea (falsos negativos de calidad del dato).
- *Solo DNI, sin NIE*: excluye colectivo real.
- *Validación contra padrón/externo*: fuera de alcance (RN-009, sin integraciones).

## R4 — Prevención de duplicados y unicidad de documento

**Decision**: `UNIQUE` en columna `document_normalized` a nivel de BD + comprobación explícita en `patientService` para devolver un error de dominio amigable (409). La BD es la garantía final ante la carrera (edge case "alta concurrente").

**Rationale**:
- Solo comprobación en aplicación tiene TOCTOU: dos altas simultáneas superarían el `SELECT`. El constraint la cierra.
- Mensaje de dominio en español permite cumplir el escenario US1.3 ("rechaza como duplicado") sin filtrar datos sensibles del paciente existente.

**Alternatives considered**:
- *Solo aplicación*: vulnerable a la carrera (edge case de la spec).
- *Solo BD*: error crudo de SQLite sería ilegible para el usuario; se mapea igualmente, pero la comprobación previa mejora el mensaje en el caso normal.
- *Fusión/desduplicación automática*: explícitamente fuera de alcance (Out of Scope).

## R5 — Diseño de la API y formato de contratos

**Decision**: API REST JSON bajo `/api/patients` con los siguientes recursos (detalle en `contracts/api.md`):

| Operación | Endpoint | FR |
|-----------|----------|----|
| Alta | `POST /api/patients` | FR-001..006 |
| Búsqueda exacta | `GET /api/patients/search?document=` o `?hcCode=` | FR-007..012 |
| Lectura por id | `GET /api/patients/:id` | FR-009 (integración) |
| Actualización | `PATCH /api/patients/:id` | FR-013..018 |

**Rationale**:
- REST/JSON es el patrón por defecto para que otros módulos del HIS consuman la identidad (FR-020) y es comprobable con Supertest.
- `PATCH` (parcial) encaja con FR-014 (completar campos opcionales sin reenviar todo el registro).
- Un único contrato documentado habilita las pruebas de contrato de `tests/contract/`.

**Alternatives considered**:
- *GraphQL*: sobredimensionado para 4 operaciones; añade dependencia y curva de aprendizaje.
- *RPC tipo gRPC*: peor inspección con curl/navegador para una práctica.
- *Búsqueda por nombre*: excluida por RN-004.

## R6 — Validación de entrada

**Decision**: `express-validator` con cadenas de validación compartidas en `validation/patientRules.js` (reutilizadas en alta, actualización y búsqueda). Errores devueltos en español, estructura `{ error: { code, message, details? } }`, vía `middleware/errorHandler`.

**Rationale**:
- FR-003/FR-011/FR-015 exigen validación con mensajes claros; centralizar reglas evita divergencia entre alta y actualización (RN-003 vs RN-006).
- Estructura de error única hace testeable el criterio "sin error de sistema" (SC-005) y los mensajes de validación.

**Alternatives considered**:
- *Zod*: igual de válida; se elige express-validator por integración directa con Express y menor superficie para este volumen.
- *Validación manual en handlers*: propensa a olvidos y duplicación entre POST/PATCH.

## R7 — Interfaz administrativa

**Decision**: Frontend estático sin build (HTML/CSS/JS vanilla) servido desde `src/public/`: página de búsqueda/listado (`index.html`) y formulario de alta/edición (`form.html`) que consumen la API.

**Rationale**:
- Los escenarios de aceptación están descritos en términos de usuario administrativo (formularios, confirmaciones): una UI mínima permite ejecutarlos manualmente (quickstart) y demos.
- Sin build step: el ZIP arranca con `npm start` (coherente con R1).

**Alternatives considered**:
- *API-only*: no permite "completar el alta en <3 min" (SC-001) de forma evaluable con un usuario real.
- *SPA con framework*: complejidad y dependencias de build sin beneficio para 2 pantallas.

## R8 — Estrategia de pruebas

**Decision**:
- Unitarias: `dni.test.js` (letras válidas/inválidas, NIE), `patientService.test.js` (reglas con repositorio simulado).
- Integración: `patients.api.test.js` con Supertest contra `app` usando BD SQLite en memoria/temporal por test.
- Contrato: `api.contract.test.js` verifica códigos de estado, formas de payload y casos de `contracts/api.md`.

**Rationale**: trazabilidad spec → contrato → test (criterios de evaluación de la práctica). BD en memoria por suite = tests paralelos y deterministas.

**Alternatives considered**: solo tests manuales (no verificable); Cobertura de e2e con navegador (Playwright) innecesaria para el alcance.

## R9 — Seguridad básica (sin auth)

**Decision**: `helmet` para cabeceras, límite de tamaño de body (100 KB), validación de todos los inputs, escaping en el frontend al pintar datos, sin secrets en el repo. Sin autenticación: explícitamente fuera de alcance (FR-019/RN-010).

**Rationale**: el spec excluye control de acceso; sí se aplican prácticas mínimas para no exponer la app de forma trivial (datos personales = sensible).

**Alternatives considered**: añadir JWT/roles — viola el alcance (Out of Scope).

## Resumen de decisiones

| ID | Tema | Decisión |
|----|------|----------|
| R1 | BD relacional | SQLite + better-sqlite3 |
| R2 | Identidad única | UUID interno + código `HC-NNNNNN` secuencial |
| R3 | Documento | Validación DNI/NIE (letra) + alfanumérico libre; normalización mayúsculas |
| R4 | Duplicados | UNIQUE en BD + precheck con error 409 de dominio |
| R5 | API | REST JSON `/api/patients` (POST, GET search, GET :id, PATCH :id) |
| R6 | Validación | express-validator + errorHandler con mensajes ES |
| R7 | UI | HTML/JS estático sin build servido por Express |
| R8 | Tests | Jest + Supertest (unit / integration / contract) |
| R9 | Seguridad | helmet + límites + sin auth (fuera de alcance) |

**NEEDS CLARIFICATION restantes**: ninguno.
