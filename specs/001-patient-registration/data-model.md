# Data Model: Registro e Identificación del Paciente (HIS)

**Feature**: 001-patient-registration | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Entidades extraídas del apartado *Key Entities* y de los FR/RN del spec. Modelo relacional lógico + reglas de validación y transiciones.

## Entidad: Patient (patients)

Representa a una persona dada de alta en el sistema; es la entidad raíz referida por futuros módulos del HIS.

| Campo | Tipo lógico | Obligatorio | Editable | Descripción / Reglas |
|-------|-------------|-------------|----------|----------------------|
| `id` | UUID (texto 36) | Sí (sistema) | **No** | Identidad interna única; PK. Se genera en el alta; inmutable (RN-001, RN-007, FR-016). |
| `hc_code` | Texto (`HC-` + 6 dígitos) | Sí (sistema) | **No** | Código de historia clínica único; generado correlativo. Inmutable (FR-002, RN-007). |
| `document_type` | Enum: `DNI` \| `NIE` \| `OTHER` | Sí | Sí | Tipo de documento; inferido del formato en la validación. |
| `document_number` | Texto (5–20) | Sí | Sí* | Número de documento tal cual se muestra. Obligatorio en alta (RN-003). |
| `document_normalized` | Texto (5–20) | Sí (sistema) | **No** (derivado) | Versión normalizada: mayúsculas, sin espacios. **UNIQUE** (RN-002, FR-004). Se recalcula si cambia `document_number`. |
| `first_name` | Texto (1–80) | Sí | Sí | Nombre; sin espacios solo al inicio/fin (se normaliza). Obligatorio (RN-003). |
| `last_name` | Texto (1–120) | Sí | Sí | Apellidos; obligatorio (RN-003). |
| `birth_date` | Fecha (`YYYY-MM-DD`) | No | Sí | Opcional; no puede ser futura. |
| `sex` | Enum: `M` \| `F` \| `O` \| null | No | Sí | Opcional (Assumptions). |
| `phone` | Texto (7–20) | No | Sí | Opcional; dígitos, espacios, `+`, `(`, `)`, `-`. |
| `email` | Texto (≤120) | No | Sí | Opcional; formato email válido si se envía. |
| `address` | Texto (≤200) | No | Sí | Domicilio opcional. |
| `insurance_number` | Texto (1–40) | **Sí** | Sí | Número de seguro/mutua; obligatorio en alta (RN-003); alfanumérico libre, sin verificación externa (RN-009). |
| `insurer_name` | Texto (≤80) | No | Sí | Aseguradora/mutua; solo dato, sin integración (RN-009). |
| `created_at` | Timestamp (UTC) | Sí (sistema) | **No** | Fecha/hora de alta (FR-005). |
| `updated_at` | Timestamp (UTC) | Sí (sistema) | No editable directamente | Se actualiza en cada `PATCH` (soporte operativo; historial completo fuera de alcance). |

\* `document_number` es editable solo en el sentido de permitir corrección de erratas en actualización; al cambiarlo se revalida letra (si DNI/NIE) y se reanuda `document_normalized` con la misma estrategia de unicidad (rechazo 409 si colisiona).

### Constraints (DDL)

- `PRIMARY KEY (id)`
- `UNIQUE (hc_code)`
- `UNIQUE (document_normalized)` ← garantía de FR-004 ante concurrencia
- `CHECK (document_type IN ('DNI','NIE','OTHER'))`
- `CHECK (insurance_number IS NOT NULL AND trim(insurance_number) <> '')`
- `CHECK (first_name/last_name no vacíos)`
- Índices: `idx_patients_document_normalized` (único, implícito), `idx_patients_hc_code` (único, implícito), `idx_patients_last_first` sobre (`last_name`, `first_name`) para listado.

## Entidad: Sequence (sequences)

Soporte para la generación del código HC (no es un dominio del HIS, es infraestructura de identidad).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | Texto PK | Nombre de la secuencia (`hc_code`). |
| `value` | Entero | Último valor emitido. |

- Operación: `UPDATE sequences SET value = value + 1 WHERE name = 'hc_code' RETURNING value` dentro de transacción → formatear `HC-` + `padStart(6, '0')` (R2 de research.md).

## Entidad lógica: Identidad del paciente (no es tabla aparte)

Compuesta por `id` + `hc_code` de un mismo registro `patients`. Es el **contrato de integración** con el resto del HIS (FR-002, FR-020):
- Otros módulos referencian pacientes por `id` (FK futura: `appointments.patient_id → patients.id`).
- Personal administrativo verifica identidad por `hc_code` o `document_normalized` (FR-007/FR-008).

## Reglas de validación (por operación)

### Alta — `POST /api/patients` (FR-001..006, RN-003)

| Campo | Regla |
|-------|-------|
| `firstName`, `lastName`, `documentNumber`, `insuranceNumber` | Obligatorios, no vacíos tras trim |
| `documentNumber` | Según tipo: DNI `8 dígitos + letra válida`; NIE `[X,Y,Z] + 7 dígitos + letra válida`; OTHER 5–20 alfanuméricos |
| `email` | Opcional; si presente → formato válido |
| `phone` | Opcional; patrón `^[+0-9()\-\s]{7,20}$` |
| `birthDate` | Opcional; fecha válida y no futura |
| `documentNormalized` | Único → si existe: **409** `DOCUMENT_ALREADY_REGISTERED` (FR-004, US1.3) |

Éxito: **201** con payload `{ id, hcCode, ...datos }` (FR-006).

### Búsqueda — `GET /api/patients/search` (FR-007..012, RN-004)

| Entrada | Regla |
|---------|-------|
| Exactamente un parámetro: `document` **o** `hcCode` | Ambos o ninguno → **400** `INVALID_SEARCH_CRITERIA` (FR-011) |
| `document` | Normalizado y validado igual que en alta |
| `hcCode` | Patrón `^HC-\d{6}$` (case-insensitive, se normaliza a mayúsculas) |
| Sin coincidencia | **404** `PATIENT_NOT_FOUND` — no es error de sistema (FR-010, SC-005) |
| Coincidencia | **200** con un único paciente (FR-012) |

### Actualización — `PATCH /api/patients/:id` (FR-013..018, RN-006, RN-007)

| Regla | Efecto |
|-------|--------|
| `id` inexistente | **404** `PATIENT_NOT_FOUND` (FR-017) |
| Campos enviados | Parciales; se validan con las mismas reglas del alta (FR-015) |
| Campos obligatorios a vacío | **400** `REQUIRED_FIELD_EMPTY` (FR-018, RN-006) |
| `id`, `hcCode`, `createdAt` en body | Ignorados/no aceptados: inmutables (FR-016, RN-007) |
| Cambio de `documentNumber` | Revalidar + recalcular `document_normalized`; colisión → **409** |
| Éxito | **200** con el paciente actualizado; `updatedAt` refrescado |

## Transiciones de estado

El paciente no tiene ciclo de vida con estados (sin alta/baja: RN-008). Única "transición": `no existe → registrado → (actualizaciones de atributos)` con identidad fija. Diagrama:

```text
[inexistente]
     │ POST /api/patients (validación + unicidad OK)
     ▼
[registrado]  ←──── PATCH /api/patients/:id (atributos editables)
     │                (id, hcCode, createdAt intactos)
     │
     ✗  no hay transición de baja/borrado (RN-008)
```

## Relaciones (diseño para integración futura, fuera de alcance)

```text
patients (1) ──< (N) future_appointments.patient_id   → FK a patients.id
patients (1) ──< (N) future_clinical_records.patient_id
patients (1) ──< (N) future_invoices.patient_id
```

Ninguna de estas tablas se implementa en esta práctica; se documenta para evidenciar que la identidad única es reutilizable (criterio de evaluación).
