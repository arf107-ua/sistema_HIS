# Quickstart: Validación del módulo Registro e Identificación del Paciente

**Feature**: 001-patient-registration | **Date**: 2026-09-22  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contrato**: [contracts/api.md](./contracts/api.md) | **Modelo**: [data-model.md](./data-model.md)

Guía de validación extremo a extremo. No incluye implementación (eso vive en el código y en `tasks.md`): solo prerequisitos, comandos y escenarios con resultado esperado.

## 1. Prerrequisitos

- Node.js 20 LTS o superior instalado (`node -v`)
- Puerto libre en `3000` (o variable `PORT`)
- Sin necesidad de servidor de base de datos externo (SQLite embebido)

## 2. Puesta en marcha

```bash
# desde la raíz del proyecto
npm install          # instala dependencias
npm run migrate      # crea/aplica schema.sql (idempotente)
npm start            # arranca HTTP en http://localhost:3000
```

Verificación de vida:

```bash
curl http://localhost:3000/api/health
# esperado: 200 { "status": "ok" }
```

UI administrativa: abrir `http://localhost:3000/` (búsqueda/listado) y `http://localhost:3000/form.html` (alta/edición).

## 3. Suite de pruebas automatizadas

```bash
npm test             # unit + integration + contract (Jest)
```

| Suite | Qué prueba | Trazabilidad |
|-------|------------|--------------|
| `tests/unit/dni.test.js` | Letra DNI/NIE válida/inválida | FR-003 |
| `tests/unit/patientService.test.js` | Unicidad, inmutabilidad de identidad | FR-004, FR-016, RN-001 |
| `tests/integration/patients.api.test.js` | Flujo alto→búsqueda→actualización vía HTTP | US1–US3 |
| `tests/contract/api.contract.test.js` | Estados y payloads de `contracts/api.md` | SC-005, SC-007 |

Resultado esperado: todas las suites en verde.

## 4. Escenarios manuales de aceptación (Given/When/Then del spec)

Ejecutar en orden con el servidor levantado. Usar `curl` o la UI; se muestra `curl`.

### E1 — Alta válida + identidad única (US1.1, FR-002, FR-006, SC-003)

```bash
curl -s -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"documentType":"DNI","documentNumber":"12345678Z","firstName":"María","lastName":"López García","insuranceNumber":"MUT-998877","email":"maria@example.com"}'
```

**Esperado**: `201` con `id` (UUID), `hcCode` (`HC-000001` en BD limpia) y `createdAt`.

### E2 — Alta duplicada rechazada (US1.3, FR-004, SC-002)

Repetir exactamente E1.

**Esperado**: `409` `DOCUMENT_ALREADY_REGISTERED`; no se crea un segundo registro (comprobar que la búsqueda sigue devolviendo 1 resultado).

### E3 — Alta inválida (US1.2, FR-003)

```bash
curl -s -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"documentType":"DNI","documentNumber":"12345678A","firstName":"Ana","lastName":"Sin Datos","insuranceNumber":"X"}'
# y otro sin firstName
```

**Esperado**: `400` con `details` por campo; BD sin nuevos pacientes (SC-007 análogo para PATCH).

### E4 — Búsqueda por documento (US2.1, FR-007, SC-004)

```bash
curl -s "http://localhost:3000/api/patients/search?document=12345678z"
```

**Esperado**: `200` con array de 1 paciente; mismo `id` que en E1 (normalización de mayúsculas, RN-002).

### E5 — Búsqueda por código HC (US2.2, FR-008, RN-005)

```bash
curl -s "http://localhost:3000/api/patients/search?hcCode=HC-000001"
```

**Esperado**: `200` con el **mismo** paciente que E4.

### E6 — Búsqueda sin coincidencia (US2.3, FR-010, SC-005)

```bash
curl -s "http://localhost:3000/api/patients/search?document=00000000T"
```

**Esperado**: `200` con `[]` — sin cuerpo de error, sin 500.

### E7 — Búsqueda inválida (US2.4–2.5, FR-011)

```bash
curl -s "http://localhost:3000/api/patients/search"                 # sin criterio
curl -s "http://localhost:3000/api/patients/search?document=12345678Z&hcCode=HC-000001"  # ambos
```

**Esperado**: `400` `INVALID_SEARCH_CRITERIA` en ambos casos.

### E8 — Actualización de contacto (US3.1, FR-013, SC-006)

```bash
curl -s -X PATCH http://localhost:3000/api/patients/{id} \
  -H "Content-Type: application/json" \
  -d '{"phone":"+34 611 999 888","address":"Avenida del Sol 22, Madrid"}'
```

**Esperado**: `200`; una búsqueda posterior muestra los nuevos valores; `id` y `hcCode` idénticos (FR-016).

### E9 — Completar campo opcional vacío (US3.2, FR-014)

Dar de alta sin `email`, luego `PATCH` con `{"email":"nuevo@example.com"}`.

**Esperado**: `200` y el email visible en la siguiente lectura.

### E10 — Actualización inválida no altera datos (US3.3, FR-015, SC-007)

`PATCH` con `{"email":"no-es-email"}`.

**Esperado**: `400`; una lectura del paciente confirma que email/phone anteriores **no** cambiaron.

### E11 — Paciente inexistente (US3.5, FR-017)

```bash
curl -s -X PATCH http://localhost:3000/api/patients/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" -d '{"phone":"600000000"}'
```

**Esperado**: `404` `PATIENT_NOT_FOUND`.

### E12 — Identidad reutilizable por otros módulos (SC-008, FR-020)

Con el `id` obtenido en E1:

```bash
curl -s http://localhost:3000/api/patients/{id}
```

**Esperado**: `200` con datos de identificación mínimos (id, hcCode, nombre, documento, contacto) — mismo payload que devolvería la búsqueda (FR-009).

### E13 — Carrera de duplicados (Edge case)

Dos `POST` simultáneos con el mismo `documentNumber` (ej. dos ventanas de curl en paralelo).

**Esperado**: exactamente un `201` y un `409`; unicidad garantizada por constraint de BD.

## 5. Criterios de éxito verificables aquí

| SC | Cómo se verifica |
|----|------------------|
| SC-001 | E1 completado en < 3 min por un usuario |
| SC-002 | E2 + E13: 0 duplicados en BD |
| SC-003 | E8: mismo `id`/`hcCode` antes y después del PATCH |
| SC-004 | E4/E5: respuesta correcta en < 2 s |
| SC-005 | E6: `200 []` sin error de sistema |
| SC-006 | E8: nuevo valor visible en siguiente consulta |
| SC-007 | E10: datos previos intactos tras rechazo |
| SC-008 | E12: resolución por identidad para consumidores externos |

## 6. Limpieza

```bash
npm run reset-db     # elimina el fichero SQLite local (si existe script) o borrar data/*.db manualmente
```
