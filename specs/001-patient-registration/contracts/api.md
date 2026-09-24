# Contract: API de Registro e Identificación del Paciente

**Feature**: 001-patient-registration | **Date**: 2026-09-22 | **Spec**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

Contrato REST JSON consumible por la UI administrativa y, en el HIS completo, por cualquier módulo que necesite verificar la identidad de un paciente (FR-020). Base path: `/api`. Content-Type: `application/json` (salvo respuestas 204, que no existen en este contrato).

## Convenciones de error

Todas las respuestas de error siguen:

```json
{
  "error": {
    "code": "MACHINE_CODE",
    "message": "Mensaje legible en español",
    "details": [{ "field": "email", "message": "..." }]
  }
}
```

| HTTP | code | Origen (FR) |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | FR-003, FR-011, FR-015 |
| 400 | `INVALID_SEARCH_CRITERIA` | FR-011 (0 o 2 criterios) |
| 400 | `REQUIRED_FIELD_EMPTY` | FR-018, RN-006 |
| 404 | `PATIENT_NOT_FOUND` | FR-010, FR-017 (no es error de sistema: SC-005) |
| 409 | `DOCUMENT_ALREADY_REGISTERED` | FR-004, RN-002 (US1.3) |

## Resource: Patient (JSON)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "hcCode": "HC-000001",
  "documentType": "DNI",
  "documentNumber": "12345678Z",
  "firstName": "María",
  "lastName": "López García",
  "birthDate": "1985-04-12",
  "sex": "F",
  "phone": "+34 600 123 456",
  "email": "maria.lopez@example.com",
  "address": "Calle Mayor 1, 2ºB, 28013 Madrid",
  "insuranceNumber": "MUT-998877",
  "insurerName": "Mutua Sanitaria",
  "createdAt": "2026-09-22T10:15:00.000Z",
  "updatedAt": "2026-09-22T10:15:00.000Z"
}
```

`id` y `hcCode` son la identidad única e inmutable (FR-002, RN-007). `updatedAt` puede ser igual a `createdAt` si nunca hubo PATCH.

---

## 1. Alta de paciente — FR-001..FR-006

`POST /api/patients`

**Request** (obligatorios: `firstName`, `lastName`, `documentNumber`, `insuranceNumber`):

```json
{
  "documentType": "DNI",
  "documentNumber": "12345678Z",
  "firstName": "María",
  "lastName": "López García",
  "birthDate": "1985-04-12",
  "sex": "F",
  "phone": "+34 600 123 456",
  "email": "maria.lopez@example.com",
  "address": "Calle Mayor 1, 2ºB, 28013 Madrid",
  "insuranceNumber": "MUT-998877",
  "insurerName": "Mutua Sanitaria"
}
```

| Respuesta | Condición |
|-----------|-----------|
| **201** + Patient completo (con `id`, `hcCode`, `createdAt`) | Alta OK (FR-006) |
| **400** `VALIDATION_ERROR` | Falta obligatorio o formato inválido (FR-003) |
| **409** `DOCUMENT_ALREADY_REGISTERED` | Documento ya registrado (FR-004, US1.3) — el mensaje no expone datos sensibles del paciente existente |

---

## 2. Búsqueda / verificación de identidad — FR-007..FR-012

`GET /api/patients/search?document={doc}`  
`GET /api/patients/search?hcCode={HC-000001}`

| Respuesta | Condición |
|-----------|-----------|
| **200** + array con **exactamente 1** Patient | Coincidencia exacta (FR-012) |
| **200** + array vacío `[]` | Sin coincidencia — tratado como "no encontrado" sin error de sistema (FR-010, SC-005) |
| **400** `INVALID_SEARCH_CRITERIA` | Ningún criterio, ambos criterios, o formato inválido (FR-011, RN-004) |

Notas:
- Solo coincidencia **exacta** (RN-004); no hay búsqueda por nombre.
- Buscar por `document` y por `hcCode` del mismo paciente devuelve siempre el mismo `id` (RN-005).
- `document` se normaliza (mayúsculas, sin espacios) antes de comparar (RN-002).

---

## 3. Lectura por identidad — FR-009, FR-020

`GET /api/patients/{id}`

| Respuesta | Condición |
|-----------|-----------|
| **200** + Patient | Identidad válida |
| **404** `PATIENT_NOT_FOUND` | Id inexistente |

Uso previsto por otros módulos del HIS: resolver `patient_id` (FK) → datos de identificación.

---

## 4. Actualización — FR-013..FR-018

`PATCH /api/patients/{id}` — body parcial, solo campos editables:

```json
{
  "phone": "+34 611 999 888",
  "email": "nuevo.correo@example.com",
  "address": "Avenida del Sol 22, 4ºA, 28005 Madrid"
}
```

| Respuesta | Condición |
|-----------|-----------|
| **200** + Patient actualizado (mismo `id` y `hcCode`) | Actualización OK (FR-013..016) |
| **400** `VALIDATION_ERROR` / `REQUIRED_FIELD_EMPTY` | Valor inválido o vacío en obligatorio (FR-015, FR-018) |
| **404** `PATIENT_NOT_FOUND` | Id inexistente (FR-017) |
| **409** `DOCUMENT_ALREADY_REGISTERED` | El nuevo documento ya pertenece a otro paciente |

Inmutables: `id`, `hcCode`, `createdAt` — se ignoran si se envían (FR-016, RN-007). `documentNumber` es editable con revalidación (ver data-model).

---

## 5. Health (soporte operativo mínimo)

`GET /api/health` → **200** `{ "status": "ok" }` — no forma parte de requisitos funcionales; sirve para smoke tests del quickstart.

## Trazabilidad spec → contrato

| Spec | Endpoint(s) |
|------|-------------|
| US1 / FR-001..006 | `POST /api/patients` |
| US2 / FR-007..012 | `GET /api/patients/search` |
| US3 / FR-013..018 | `PATCH /api/patients/:id` |
| FR-009 / FR-020 | `GET /api/patients/:id` |
