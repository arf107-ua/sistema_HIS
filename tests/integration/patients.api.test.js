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
  insuranceNumber: 'MUT-998877',
  email: 'maria@example.com',
  phone: '+34 600 123 456'
};

describe('US1 — Alta (E1–E3)', () => {
  test('E1: alta válida devuelve 201 con identidad única', async () => {
    const res = await request(app).post('/api/patients').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(res.body.hcCode).toBe('HC-000001');
    expect(res.body.firstName).toBe('María');
    expect(res.body.createdAt).toBeDefined();
  });

  test('E2: documento duplicado → 409 y sin segundo registro (SC-002)', async () => {
    await request(app).post('/api/patients').send(validBody);
    const res = await request(app)
      .post('/api/patients')
      .send({ ...validBody, firstName: 'Otra' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DOCUMENT_ALREADY_REGISTERED');

    const search = await request(app).get('/api/patients/search?document=12345678Z');
    expect(search.status).toBe(200);
    expect(search.body).toHaveLength(1);
  });

  test('E3: alta inválida → 400 y no crea registro (SC-007)', async () => {
    const res = await request(app)
      .post('/api/patients')
      .send({ ...validBody, documentNumber: '12345678A', email: 'no-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);

    const search = await request(app).get('/api/patients/search?document=11111111H');
    expect(search.body).toEqual([]);
    const count = db.prepare('SELECT COUNT(*) AS c FROM patients').get();
    expect(count.c).toBe(0);
  });

  test('E3b: falta campo obligatorio → 400', async () => {
    const res = await request(app)
      .post('/api/patients')
      .send({ documentNumber: '12345678Z', firstName: 'Ana', insuranceNumber: 'X1' });
    expect(res.status).toBe(400);
  });

  test('SC-002/carrera: dos altas concurrentes mismo documento → un 201 y un 409', async () => {
    const [a, b] = await Promise.all([
      request(app).post('/api/patients').send(validBody),
      request(app).post('/api/patients').send({ ...validBody, firstName: 'Carrera' })
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
  });
});

describe('US2 — Búsqueda (E4–E7)', () => {
  let created;

  beforeEach(async () => {
    const res = await request(app).post('/api/patients').send(validBody);
    created = res.body;
  });

  test('E4: búsqueda por documento case-insensitive (SC-004)', async () => {
    const res = await request(app).get('/api/patients/search?document=12345678z');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(created.id);
  });

  test('E5: búsqueda por hcCode devuelve el mismo paciente (RN-005)', async () => {
    const res = await request(app).get('/api/patients/search?hcCode=HC-000001');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(created.id);
  });

  test('E6: sin coincidencia → 200 [] sin error de sistema (SC-005)', async () => {
    const res = await request(app).get('/api/patients/search?document=00000000T');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('E7a: sin criterio → 400 INVALID_SEARCH_CRITERIA (FR-011)', async () => {
    const res = await request(app).get('/api/patients/search');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_SEARCH_CRITERIA');
  });

  test('E7b: ambos criterios → 400 INVALID_SEARCH_CRITERIA', async () => {
    const res = await request(app).get(
      '/api/patients/search?document=12345678Z&hcCode=HC-000001'
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_SEARCH_CRITERIA');
  });

  test('E7c: documento con formato inválido → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/patients/search?document=XX');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('E12: GET /api/patients/:id resuelve identidad (SC-008, FR-009)', async () => {
    const res = await request(app).get(`/api/patients/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.id,
      hcCode: created.hcCode,
      firstName: 'María',
      documentNumber: '12345678Z'
    });
  });

  test('GET /api/patients/:id inexistente → 404', async () => {
    const res = await request(app).get('/api/patients/00000000-0000-4000-8000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PATIENT_NOT_FOUND');
  });
});

describe('US3 — Actualización (E8–E11)', () => {
  let created;

  beforeEach(async () => {
    const res = await request(app).post('/api/patients').send(validBody);
    created = res.body;
  });

  test('E8: actualiza teléfono y domicilio preservando identidad (SC-003, SC-006)', async () => {
    const res = await request(app)
      .patch(`/api/patients/${created.id}`)
      .send({ phone: '+34 611 999 888', address: 'Avenida del Sol 22, Madrid' });

    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('+34 611 999 888');
    expect(res.body.address).toBe('Avenida del Sol 22, Madrid');
    expect(res.body.id).toBe(created.id);
    expect(res.body.hcCode).toBe(created.hcCode);
    expect(res.body.createdAt).toBe(created.createdAt);

    const again = await request(app).get(`/api/patients/${created.id}`);
    expect(again.body.phone).toBe('+34 611 999 888');
  });

  test('E9: completa campo opcional vacío (FR-014)', async () => {
    const noEmail = await request(app)
      .post('/api/patients')
      .send({ ...validBody, documentNumber: '11111111H', email: undefined });
    expect(noEmail.status).toBe(201);
    const id = noEmail.body.id;

    const res = await request(app)
      .patch(`/api/patients/${id}`)
      .send({ email: 'nuevo@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('nuevo@example.com');
  });

  test('E10: actualización inválida no altera datos previos (SC-007, FR-015)', async () => {
    const res = await request(app)
      .patch(`/api/patients/${created.id}`)
      .send({ email: 'no-es-email' });
    expect(res.status).toBe(400);

    const after = await request(app).get(`/api/patients/${created.id}`);
    expect(after.body.email).toBe('maria@example.com');
    expect(after.body.phone).toBe(validBody.phone);
  });

  test('E10b: vaciar obligatorio → 400 REQUIRED_FIELD_EMPTY (FR-018)', async () => {
    const res = await request(app)
      .patch(`/api/patients/${created.id}`)
      .send({ firstName: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('REQUIRED_FIELD_EMPTY');
  });

  test('E11: paciente inexistente → 404 (FR-017)', async () => {
    const res = await request(app)
      .patch('/api/patients/00000000-0000-4000-8000-000000000000')
      .send({ phone: '600000000' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PATIENT_NOT_FOUND');
  });

  test('FR-016: id y hcCode del body se ignoran (inmutabilidad)', async () => {
    const res = await request(app)
      .patch(`/api/patients/${created.id}`)
      .send({ id: 'hacked', hcCode: 'HC-999999', phone: '611111111' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Health y estáticos', () => {
  test('GET /api/health → 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
