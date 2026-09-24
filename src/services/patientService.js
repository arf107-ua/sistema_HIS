import { randomUUID } from 'node:crypto';
import {
  duplicateDocument,
  invalidSearch,
  notFound,
  requiredEmpty,
  validationError
} from '../middleware/errorHandler.js';
import { normalizeDocument, validateDocument } from '../validation/dni.js';

const HC_PATTERN = /^HC-\d{6}$/i;
const REQUIRED_FIELDS = ['firstName', 'lastName', 'documentNumber', 'insuranceNumber'];
const EDITABLE_FIELDS = [
  'documentType',
  'documentNumber',
  'firstName',
  'lastName',
  'birthDate',
  'sex',
  'phone',
  'email',
  'address',
  'insuranceNumber',
  'insurerName'
];

function isEmptyValue(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function requirePresent(data, fields) {
  const details = [];
  for (const field of fields) {
    if (isEmptyValue(data[field])) {
      details.push({ field, message: 'El campo es obligatorio' });
    }
  }
  if (details.length > 0) {
    throw validationError('Faltan campos obligatorios o son inválidos', details);
  }
}

function assertDocument(data) {
  const result = validateDocument(data.documentNumber);
  if (!result.valid) {
    throw validationError(result.message, [
      { field: 'documentNumber', message: result.message }
    ]);
  }
  return result;
}

function normalizeOptional(value) {
  if (isEmptyValue(value)) return null;
  return String(value).trim();
}

export function createPatientService({ repository, now = () => new Date().toISOString() }) {
  return {
    create(data) {
      requirePresent(data, REQUIRED_FIELDS);
      const doc = assertDocument(data);

      const existing = repository.findByNormalizedDocument(doc.normalized);
      if (existing) {
        throw duplicateDocument();
      }

      const timestamp = now();
      let created;
      try {
        created = repository.insert({
          id: randomUUID(),
          document_type: doc.type,
          document_number: doc.normalized,
          document_normalized: doc.normalized,
          first_name: String(data.firstName).trim(),
          last_name: String(data.lastName).trim(),
          birth_date: normalizeOptional(data.birthDate),
          sex: isEmptyValue(data.sex) ? null : data.sex,
          phone: normalizeOptional(data.phone),
          email: normalizeOptional(data.email),
          address: normalizeOptional(data.address),
          insurance_number: String(data.insuranceNumber).trim(),
          insurer_name: normalizeOptional(data.insurerName),
          created_at: timestamp,
          updated_at: timestamp
        });
      } catch (err) {
        if (err && err.code === 'DOCUMENT_ALREADY_REGISTERED') {
          throw duplicateDocument();
        }
        throw err;
      }

      return created;
    },

    search(query) {
      const rawDocument = query.document;
      const rawHc = query.hcCode;
      const hasDocument = !isEmptyValue(rawDocument);
      const hasHc = !isEmptyValue(rawHc);

      if (hasDocument === hasHc) {
        throw invalidSearch();
      }

      if (hasDocument) {
        const doc = validateDocument(rawDocument);
        if (!doc.valid) {
          throw validationError(doc.message, [
            { field: 'document', message: doc.message }
          ]);
        }
        const patient = repository.findByNormalizedDocument(doc.normalized);
        return patient ? [patient] : [];
      }

      const hc = String(rawHc).trim().toUpperCase();
      if (!HC_PATTERN.test(hc)) {
        const message = 'El código de historia clínica debe tener formato HC-000001';
        throw validationError(message, [{ field: 'hcCode', message }]);
      }
      const patient = repository.findByHcCode(hc);
      return patient ? [patient] : [];
    },

    getById(id) {
      const patient = repository.findById(id);
      if (!patient) {
        throw notFound();
      }
      return patient;
    },

    getAll() {
      return repository.findAll();
    },

    update(id, patch) {
      const existing = repository.findById(id);
      if (!existing) {
        throw notFound();
      }

      for (const field of ['firstName', 'lastName', 'documentNumber', 'insuranceNumber']) {
        if (field in patch && isEmptyValue(patch[field])) {
          throw requiredEmpty('Los campos obligatorios no pueden quedar vacíos', [
            { field, message: 'El campo es obligatorio' }
          ]);
        }
      }

      const fields = { updated_at: now() };

      if ('documentNumber' in patch && !isEmptyValue(patch.documentNumber)) {
        const doc = assertDocument(patch);
        const clash = repository.findByNormalizedDocument(doc.normalized);
        if (clash && clash.id !== id) {
          throw duplicateDocument();
        }
        fields.document_type = doc.type;
        fields.document_number = doc.normalized;
        fields.document_normalized = doc.normalized;
      } else if ('documentType' in patch && !isEmptyValue(patch.documentType)) {
        fields.document_type = patch.documentType;
      }

      if ('firstName' in patch) fields.first_name = String(patch.firstName).trim();
      if ('lastName' in patch) fields.last_name = String(patch.lastName).trim();
      if ('birthDate' in patch) fields.birth_date = normalizeOptional(patch.birthDate);
      if ('sex' in patch) fields.sex = isEmptyValue(patch.sex) ? null : patch.sex;
      if ('phone' in patch) fields.phone = normalizeOptional(patch.phone);
      if ('email' in patch) fields.email = normalizeOptional(patch.email);
      if ('address' in patch) fields.address = normalizeOptional(patch.address);
      if ('insuranceNumber' in patch) {
        fields.insurance_number = String(patch.insuranceNumber).trim();
      }
      if ('insurerName' in patch) fields.insurer_name = normalizeOptional(patch.insurerName);

      for (const field of EDITABLE_FIELDS) {
        if (field in patch && field in fields && isEmptyValue(fields[field]) &&
            ['first_name', 'last_name', 'insurance_number'].includes(
              { firstName: 'first_name', lastName: 'last_name', insuranceNumber: 'insurance_number' }[field]
            )) {
          throw requiredEmpty();
        }
      }

      try {
        return repository.update(id, fields);
      } catch (err) {
        if (err && err.code === 'DOCUMENT_ALREADY_REGISTERED') {
          throw duplicateDocument();
        }
        throw err;
      }
    }
  };
}
