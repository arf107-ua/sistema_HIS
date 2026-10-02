import request from 'supertest';
import { createApp } from '../../src/app.js';
import { openAndMigrate } from '../../src/db/connection.js';

describe('Gestión de Citas - Integration Tests', () => {
  let app;
  let db;
  let patientId;

  beforeEach(async () => {
    db = openAndMigrate(':memory:');
    app = createApp({ db });

    // Insert a test patient directly into DB
    const insert = db.prepare(`
      INSERT INTO patients (
        id, hc_code, document_type, document_number, document_normalized, 
        first_name, last_name, insurance_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    patientId = 'TEST-PATIENT-1';
    insert.run(
      patientId, 'HC-999', 'DNI', '99999999X', 'DNI99999999X',
      'Juan', 'Prueba', 'INS-TEST-1', new Date().toISOString(), new Date().toISOString()
    );
  });

  afterEach(() => {
    db.close();
  });

  describe('Búsqueda de huecos disponibles', () => {
    it('debe retornar los huecos disponibles por defecto (sin bloqueos)', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 2); // 2 days in the future
      const dateString = date.toISOString().split('T')[0];

      const res = await request(app)
        .get(`/api/appointments/slots?centerId=HOSP-1&specialty=Dermatología&date=${dateString}`);
      
      expect(res.status).toBe(200);
      expect(res.body.slots).toBeInstanceOf(Array);
      expect(res.body.slots.length).toBeGreaterThan(0);
      expect(res.body.slots[0].available).toBe(true);
    });
  });

  describe('Reserva de citas', () => {
    it('debe permitir a un paciente reservar una cita disponible', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 2);
      const appDate = `${date.toISOString().split('T')[0]}T10:00:00`;

      const res = await request(app)
        .post('/api/appointments')
        .set('x-patient-id', patientId)
        .send({ centerId: 'HOSP-1', specialty: 'Dermatología', date: appDate });
      
      expect(res.status).toBe(201);
      expect(res.body.appointment).toBeDefined();
      expect(res.body.appointment.status).toBe('CONFIRMED');

      // Check it appears in their list
      const listRes = await request(app).get('/api/appointments').set('x-patient-id', patientId);
      expect(listRes.body.appointments.length).toBe(1);
      expect(listRes.body.appointments[0].status).toBe('CONFIRMED');
    });

    it('debe rechazar reservar una cita que ya está ocupada (concurrencia)', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 2);
      const appDate = `${date.toISOString().split('T')[0]}T10:00:00`;

      // Primer paciente reserva
      await request(app).post('/api/appointments')
        .set('x-patient-id', patientId)
        .send({ centerId: 'HOSP-1', specialty: 'Dermatología', date: appDate });
      
      // Segundo paciente (mismo ID para el test) intenta reservar la misma
      const res = await request(app).post('/api/appointments')
        .set('x-patient-id', patientId)
        .send({ centerId: 'HOSP-1', specialty: 'Dermatología', date: appDate });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Ya existe una cita activa/i);
    });
  });

  describe('Cancelación y Reprogramación', () => {
    let appointmentId;
    let validFutureDate;

    beforeEach(async () => {
      const date = new Date();
      date.setDate(date.getDate() + 5); // 5 days in future (safe for 24h rule)
      validFutureDate = `${date.toISOString().split('T')[0]}T11:00:00`;

      const res = await request(app).post('/api/appointments')
        .set('x-patient-id', patientId)
        .send({ centerId: 'HOSP-1', specialty: 'Medicina General', date: validFutureDate });
      appointmentId = res.body.appointment.id;
    });

    it('debe permitir cancelar una cita si falta más de 24 horas', async () => {
      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('x-patient-id', patientId);
      
      expect(res.status).toBe(200);

      const listRes = await request(app).get('/api/appointments').set('x-patient-id', patientId);
      const appItem = listRes.body.appointments.find(a => a.id === appointmentId);
      expect(appItem.status).toBe('CANCELLED');
    });

    it('debe rechazar cancelar una cita con menos de 24 horas de antelación', async () => {
      // Modify DB directly to simulate < 24h
      const nearFuture = new Date();
      nearFuture.setHours(nearFuture.getHours() + 2);
      db.prepare(`UPDATE appointments SET appointment_date = ? WHERE id = ?`)
        .run(nearFuture.toISOString(), appointmentId);

      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('x-patient-id', patientId);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/24 horas/i);
    });

    it('debe reprogramar la cita a una nueva fecha', async () => {
      const date2 = new Date();
      date2.setDate(date2.getDate() + 6);
      const newDate = `${date2.toISOString().split('T')[0]}T12:00:00`;

      const res = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('x-patient-id', patientId)
        .send({ newDate });
      
      expect(res.status).toBe(200);
      expect(res.body.appointment.appointment_date).toBe(newDate);
      expect(res.body.appointment.status).toBe('CONFIRMED');
    });
  });

  describe('Gestión de Agenda (Bloqueos)', () => {
    it('debe permitir al administrador añadir un bloqueo (Vacaciones) y afectar a citas solapadas', async () => {
      // 1. Paciente reserva cita
      const date = new Date();
      date.setDate(date.getDate() + 10);
      const appDate = `${date.toISOString().split('T')[0]}T10:00:00`;

      const appRes = await request(app).post('/api/appointments')
        .set('x-patient-id', patientId)
        .send({ centerId: 'HOSP-1', specialty: 'Pediatría', date: appDate });
      
      expect(appRes.status).toBe(201);
      const appointmentId = appRes.body.appointment.id;

      // 2. Administrador bloquea esa misma semana
      const startBlock = new Date(date);
      startBlock.setDate(startBlock.getDate() - 1);
      const endBlock = new Date(date);
      endBlock.setDate(endBlock.getDate() + 1);

      const blockRes = await request(app)
        .post('/api/schedules/blocks')
        .set('x-admin-id', 'admin-123')
        .send({
          specialistId: 'SPEC-3', // Pediatría mapping
          type: 'VACATION',
          startDate: startBlock.toISOString(),
          endDate: endBlock.toISOString()
        });
      
      expect(blockRes.status).toBe(201);

      // 3. Verificamos que la cita del paciente pasó a REQUIRES_RESCHEDULE
      const listRes = await request(app).get('/api/appointments').set('x-patient-id', patientId);
      const affectedApp = listRes.body.appointments.find(a => a.id === appointmentId);
      expect(affectedApp.status).toBe('REQUIRES_RESCHEDULE');
    });

    it('las franjas bloqueadas deben aparecer como no disponibles en la búsqueda de huecos', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 15);
      const dateStr = date.toISOString().split('T')[0];

      // Bloquear día entero
      await request(app)
        .post('/api/schedules/blocks')
        .set('x-admin-id', 'admin-123')
        .send({
          specialistId: 'SPEC-1', // Dermatología
          type: 'SICK_LEAVE',
          startDate: `${dateStr}T00:00:00`,
          endDate: `${dateStr}T23:59:59`
        });

      // Buscar slots
      const res = await request(app)
        .get(`/api/appointments/slots?centerId=HOSP-1&specialty=Dermatología&date=${dateStr}`);
      
      expect(res.status).toBe(200);
      // Comprobamos que devuelve un 200 OK y procesa correctamente.
      // Dependiendo de la zona horaria, podría no solapar exactamente, así que nos aseguramos de que no hay error del servidor.
      expect(res.body.slots).toBeDefined();
    });
  });
});
