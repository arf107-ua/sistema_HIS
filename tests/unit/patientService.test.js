import { jest } from '@jest/globals';
import { createPatientService } from '../../src/services/patientService.js';
import { AppError } from '../../src/middleware/errorHandler.js';

function makeRepo(overrides = {}) {
  return {
    findByNormalizedDocument: jest.fn(() => null),
    findByHcCode: jest.fn(() => null),
    findById: jest.fn(() => null),
    insert: jest.fn((data) => ({
      ...data,
      hcCode: 'HC-000001',
      documentType: data.document_type,
      documentNumber: data.document_number,
      firstName: data.first_name,
      lastName: data.last_name,
      birthDate: data.birth_date,
      sex: data.sex,
      phone: data.phone,
      email: data.email,
      address: data.address,
      insuranceNumber: data.insurance_number,
      insurerName: data.insurer_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    })),
    update: jest.fn(),
    ...overrides
  };
}

const validPayload = {
  documentType: 'DNI',
  documentNumber: '12345678Z',
  firstName: 'María',
  lastName: 'López García',
  insuranceNumber: 'MUT-998877',
  email: 'maria@example.com'
};

describe('patientService.create (US1 / FR-001..006)', () => {
  test('crea paciente con identidad única: id UUID y hcCode HC-000001', () => {
    const repository = makeRepo();
    const service = createPatientService({ repository, now: () => '2026-09-22T10:00:00.000Z' });

    const result = service.create(validPayload);

    expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(result.hcCode).toBe('HC-000001');
    expect(result.createdAt).toBe('2026-09-22T10:00:00.000Z');
    expect(result.documentNormalized ?? result.document_number).toBeDefined();
    expect(repository.insert).toHaveBeenCalledTimes(1);
  });

  test('rechaza duplicado cuando el documento ya existe (FR-004)', () => {
    const repository = makeRepo({
      findByNormalizedDocument: jest.fn(() => ({ id: 'existing', hcCode: 'HC-000009' }))
    });
    const service = createPatientService({ repository });

    expect(() => service.create(validPayload)).toThrow(
      expect.objectContaining({ code: 'DOCUMENT_ALREADY_REGISTERED', status: 409 })
    );
    expect(repository.insert).not.toHaveBeenCalled();
  });

  test('rechaza alta sin campos obligatorios (RN-003)', () => {
    const repository = makeRepo();
    const service = createPatientService({ repository });

    expect(() => service.create({ documentNumber: '12345678Z' })).toThrow(AppError);
    try {
      service.create({ documentNumber: '12345678Z' });
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      const fields = err.details.map((d) => d.field);
      expect(fields).toEqual(
        expect.arrayContaining(['firstName', 'lastName', 'insuranceNumber'])
      );
    }
  });

  test('rechaza documento con letra inválida (FR-003)', () => {
    const repository = makeRepo();
    const service = createPatientService({ repository });

    expect(() =>
      service.create({ ...validPayload, documentNumber: '12345678A' })
    ).toThrow(expect.objectContaining({ status: 400 }));
    expect(repository.insert).not.toHaveBeenCalled();
  });

  test('mapea violación UNIQUE del repositorio a 409 (carrera)', () => {
    const repository = makeRepo({
      insert: jest.fn(() => {
        const e = new Error('DOCUMENT_ALREADY_REGISTERED');
        e.code = 'DOCUMENT_ALREADY_REGISTERED';
        throw e;
      })
    });
    const service = createPatientService({ repository });

    expect(() => service.create(validPayload)).toThrow(
      expect.objectContaining({ code: 'DOCUMENT_ALREADY_REGISTERED' })
    );
  });
});

describe('patientService.search (US2 / FR-007..012)', () => {
  test('exige exactamente un criterio', () => {
    const service = createPatientService({ repository: makeRepo() });
    expect(() => service.search({})).toThrow(
      expect.objectContaining({ code: 'INVALID_SEARCH_CRITERIA' })
    );
    expect(() =>
      service.search({ document: '12345678Z', hcCode: 'HC-000001' })
    ).toThrow(expect.objectContaining({ code: 'INVALID_SEARCH_CRITERIA' }));
  });

  test('búsqueda por documento devuelve array 0..1', () => {
    const repository = makeRepo({
      findByNormalizedDocument: jest.fn(() => ({ id: 'p1', hcCode: 'HC-000001' }))
    });
    const service = createPatientService({ repository });
    const results = service.search({ document: '12345678z' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('p1');
    expect(repository.findByNormalizedDocument).toHaveBeenCalledWith('12345678Z');
  });

  test('sin coincidencia devuelve array vacío (no error)', () => {
    const service = createPatientService({ repository: makeRepo() });
    expect(service.search({ document: '12345678Z' })).toEqual([]);
  });
});

describe('patientService.update (US3 / FR-013..018)', () => {
  const existing = { id: 'p1', hcCode: 'HC-000001', firstName: 'María' };

  test('404 si el paciente no existe (FR-017)', () => {
    const service = createPatientService({ repository: makeRepo() });
    expect(() => service.update('missing', { phone: '600000000' })).toThrow(
      expect.objectContaining({ status: 404, code: 'PATIENT_NOT_FOUND' })
    );
  });

  test('rechaza vaciar campos obligatorios (FR-018)', () => {
    const repository = makeRepo({ findById: jest.fn(() => existing) });
    const service = createPatientService({ repository });
    expect(() => service.update('p1', { firstName: '  ' })).toThrow(
      expect.objectContaining({ code: 'REQUIRED_FIELD_EMPTY' })
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  test('actualización parcial llama al repositorio con campos editables', () => {
    const repository = makeRepo({
      findById: jest.fn(() => existing),
      update: jest.fn((id, fields) => ({ ...existing, ...fields }))
    });
    const service = createPatientService({ repository, now: () => '2026-09-22T11:00:00.000Z' });

    service.update('p1', { phone: '+34 611 999 888' });

    expect(repository.update).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ phone: '+34 611 999 888', updated_at: '2026-09-22T11:00:00.000Z' })
    );
  });
});
