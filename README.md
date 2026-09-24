# HIS — Registro e Identificación del Paciente

Módulo fundacional del Sistema de Información de Gestión Hospitalaria: alta de pacientes con **identidad única reutilizable** (UUID + código de historia clínica `HC-NNNNNN`), **búsqueda/verificación** por documento o código HC y **actualización** de datos personales y de contacto.

Especificación SDD: [`specs/001-patient-registration/spec.md`](specs/001-patient-registration/spec.md)

## Requisitos

- Node.js **20 o superior** (probado en Node 24; usa `node:sqlite` incluido en el runtime)
- No requiere servidor de base de datos externo (SQLite embebido)

## Arranque Local

```bash
npm install
npm run migrate    # crea data/his.db (idempotente)
npm start          # http://localhost:3000
```

## Despliegue con Docker

El proyecto está preparado para desplegarse mediante Docker con un `Dockerfile` multi-stage. Los datos de la base de datos de SQLite se guardan de forma persistente en un volumen. Para levantar el entorno sin pasos manuales:

```bash
docker compose up -d --build
```
La aplicación correrá en `http://localhost:3000` y las migraciones se ejecutarán automáticamente al arrancar. Para detener el contenedor usa `docker compose down`.

- UI búsqueda: `http://localhost:3000/`
- UI alta/edición: `http://localhost:3000/form.html`
- UI Citas: `http://localhost:3000/appointments.html`
- Health: `GET /api/health`

## Pruebas

```bash
npm test           # unit + integration + contract (56 tests)
```

Validación manual de escenarios: [specs/001-patient-registration/quickstart.md](specs/001-patient-registration/quickstart.md)

## API (contrato: `specs/001-patient-registration/contracts/api.md`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/patients` | Alta (FR-001..006) → 201 con `id` + `hcCode` |
| GET | `/api/patients/search?document=` \| `?hcCode=` | Búsqueda exacta (FR-007..012) |
| GET | `/api/patients/:id` | Lectura por identidad (FR-009, FR-020) |
| PATCH | `/api/patients/:id` | Actualización parcial (FR-013..018) |

Errores con envelope `{ error: { code, message, details? } }`: `VALIDATION_ERROR` (400), `INVALID_SEARCH_CRITERIA` (400), `REQUIRED_FIELD_EMPTY` (400), `PATIENT_NOT_FOUND` (404), `DOCUMENT_ALREADY_REGISTERED` (409).

## Identidad única (contrato con el resto del HIS)

- `id`: UUID v4 inmutable — clave de integración para futuros módulos (citas, historia clínica, facturación).
- `hcCode`: `HC-` + correlativo de 6 dígitos, legible para recepción; también único e inmutable.
- `document_normalized`: UNIQUE en BD — garantiza cero duplicados por documento incluso ante concurrencia (RN-002, FR-004).

## Estructura

```
src/
├── app.js / server.js      # App Express y punto de entrada
├── config/                 # Puerto y ruta de BD
├── db/                     # schema.sql, conexión, migrate, reset
├── repositories/           # Única capa de SQL (patientRepository)
├── services/               # Reglas de negocio (patientService)
├── validation/             # DNI/NIE + cadenas express-validator
├── routes/                 # Endpoints REST
├── middleware/             # errorHandler + validate
└── public/                 # UI administrativa (HTML/JS sin build)
tests/{unit,integration,contract}/
specs/001-patient-registration/   # spec, plan, tasks, research, data-model, contracts, quickstart
```

## Documentos SDD

| Documento | Ruta |
|-----------|------|
| Especificación | `specs/001-patient-registration/spec.md` |
| Plan técnico | `specs/001-patient-registration/plan.md` |
| Tareas | `specs/001-patient-registration/tasks.md` |
| Research | `specs/001-patient-registration/research.md` |
| Modelo de datos | `specs/001-patient-registration/data-model.md` |
| Contrato API | `specs/001-patient-registration/contracts/api.md` |
| Quickstart | `specs/001-patient-registration/quickstart.md` |

## Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm start` | Arranca el servidor |
| `npm run migrate` | Aplica el esquema relacional |
| `npm test` | Suite completa Jest |
| `npm run reset-db` | Elimina `data/his.db` (reiniciar datos) |
