import request from 'supertest';
import { createApp } from '../../src/app.js';
import { openDb, initSchema } from '../../src/db/connection.js';

let app;
let db;

beforeEach(() => {
  db = openDb(':memory:');
  initSchema(db);
  app = createApp({ db });
});

afterEach(() => {
  db.close();
});

const validBody = {
  documentType: 'DNI',
  documentNumber: '12345678Z',
  firstName: 'María',
  lastName: 'López García',
  insuranceNumber: 'MUT-998877'
};

function expectErrorEnvelope(res, status, code) {
  expect(res.status).toBe(status);
  expect(res.body).toHaveProperty('error');
  expect(typeof res.body.error.code).toBe('string');
  expect(res.body.error.code).toBe(code);
  expect(typeof res.body.error.message).toBe('string');
  expect(res.body.error.message.length).toBeGreaterThan(0);
}

function expectPatientShape(patient) {
  expect(patient).toMatchObject({
    id: expect.any(String),
    hcCode: expect.stringMatching(/^HC-\d{6}$/),
    documentType: expect.stringMatching(/^(DNI|NIE|OTHER)$/),
    documentNumber: expect.any(String),
    firstName: expect.any(String),
    lastName: expect.any(String),
    insuranceNumber: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String)
  });
  expect(patient).toHaveProperty('birthDate');
  expect(patient).toHaveProperty('sex');
  expect(patient).toHaveProperty('phone');
  expect(patient).toHaveProperty('email');
  expect(patient).toHaveProperty('address');
  expect(patient).toHaveProperty('insurerName');
  expect(patient).not.toHaveProperty('document_normalized');
  expect(patient).not.toHaveProperty('hc_code');
}

describe('Contract §1 — POST /api/patients', () => {
  test('201 devuelve Patient completo (camelCase, sin columnas SQL)', async () => {
    const res = await request(app).post('/api/patients').send(validBody);
    expect(res.status).toBe(201);
    expectPatientShape(res.body);
  });

  test('400 VALIDATION_ERROR con details[]', async () => {
    const res = await request(app).post('/api/patients').send({ firstName: 'X' });
    expectErrorEnvelope(res, 400, 'VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details[0]).toMatchObject({
      field: expect.any(String),
      message: expect.any(String)
    });
  });

  test('409 DOCUMENT_ALREADY_REGISTERED', async () => {
    await request(app).post('/api/patients').send(validBody);
    const res = await request(app).post('/api/patients').send(validBody);
    expectErrorEnvelope(res, 409, 'DOCUMENT_ALREADY_REGISTERED');
  });
});

describe('Contract §2 — GET /api/patients/search', () => {
  beforeEach(async () => {
    await request(app).post('/api/patients').send(validBody);
  });

  test('200 array de exactamente 1 Patient', async () => {
    const res = await request(app).get('/api/patients/search?document=12345678Z');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expectPatientShape(res.body[0]);
  });

  test('200 array vacío sin coincidencia', async () => {
    const res = await request(app).get('/api/patients/search?hcCode=HC-999999');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('400 INVALID_SEARCH_CRITERIA sin criterio', async () => {
    const res = await request(app).get('/api/patients/search');
    expectErrorEnvelope(res, 400, 'INVALID_SEARCH_CRITERIA');
  });

  test('400 INVALID_SEARCH_CRITERIA con ambos criterios', async () => {
    const res = await request(app).get(
      '/api/patients/search?document=12345678Z&hcCode=HC-000001'
    );
    expectErrorEnvelope(res, 400, 'INVALID_SEARCH_CRITERIA');
  });
});

describe('Contract §3 — GET /api/patients/:id', () => {
  test('200 Patient', async () => {
    const created = await request(app).post('/api/patients').send(validBody);
    const res = await request(app).get(`/api/patients/${created.body.id}`);
    expect(res.status).toBe(200);
    expectPatientShape(res.body);
  });

  test('404 PATIENT_NOT_FOUND', async () => {
    const res = await request(app).get('/api/patients/00000000-0000-4000-8000-000000000000');
    expectErrorEnvelope(res, 404, 'PATIENT_NOT_FOUND');
  });
});

describe('Contract §4 — PATCH /api/patients/:id', () => {
  let created;

  beforeEach(async () => {
    const res = await request(app).post('/api/patients').send(validBody);
    created = res.body;
  });

  test('200 devuelve Patient actualizado con misma identidad', async () => {
    const res = await request(app)
      .patch(`/api/patients/${created.id}`)
      .send({ phone: '+34 611 222 333' });
    expect(res.status).toBe(200);
    expectPatientShape(res.body);
    expect(res.body.id).toBe(created.id);
    expect(res.body.hcCode).toBe(created.hcCode);
    expect(res.body.phone).toBe('+34 611 222 333');
  });

  test('400 REQUIRED_FIELD_EMPTY al vaciar obligatorio', async () => {
    const res = await request(app)
      .patch(`/api/patients/${created.id}`)
      .send({ insuranceNumber: '   ' });
    expectErrorEnvelope(res, 400, 'REQUIRED_FIELD_EMPTY');
  });

  test('404 PATIENT_NOT_FOUND en id inexistente', async () => {
    const res = await request(app)
      .patch('/api/patients/00000000-0000-4000-8000-000000000000')
      .send({ phone: '600000000' });
    expectErrorEnvelope(res, 404, 'PATIENT_NOT_FOUND');
  });

  test('409 si el nuevo documento pertenece a otro paciente', async () => {
    await request(app).post('/api/patients').send({
      ...validBody,
      documentNumber: '11111111H',
      firstName: 'Otro'
    });
    const res = await request(app)
      .patch(`/api/patients/${created.id}`)
      .send({ documentNumber: '11111111H' });
    expectErrorEnvelope(res, 409, 'DOCUMENT_ALREADY_REGISTERED');
  });
});

describe('Contract §5 — GET /api/health', () => {
  test('200 status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
