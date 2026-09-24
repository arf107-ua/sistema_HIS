import { v4 as uuidv4 } from 'uuid';

export function createAppointmentModel(db) {
  return {
    findAvailableSlots(specialty, centerId, date) {
      const config = db.prepare(`SELECT duration_minutes FROM schedules WHERE specialist_id = 'SPEC-1' AND type = 'WORKING_HOURS' ORDER BY created_at DESC LIMIT 1`).get();
      const duration = config ? config.duration_minutes : 30;

      const blocks = db.prepare(`
        SELECT start_date, end_date FROM schedules 
        WHERE specialist_id = 'SPEC-1' AND (type = 'VACATION' OR type = 'SICK_LEAVE')
          AND start_date <= ? AND end_date >= ?
      `).all(`${date}T23:59:59`, `${date}T00:00:00`);
      
      if (blocks.length > 0) {
        return [];
      }

      const slots = [];
      let current = new Date(`${date}T09:00:00`);
      const end = new Date(`${date}T14:00:00`);
      while (current < end) {
        const h = String(current.getHours()).padStart(2, '0');
        const m = String(current.getMinutes()).padStart(2, '0');
        slots.push(`${h}:${m}`);
        current.setMinutes(current.getMinutes() + duration);
      }

      const query = db.prepare(`
        SELECT appointment_date FROM appointments 
        WHERE center_id = ? AND specialty = ? AND status = 'CONFIRMED' AND appointment_date LIKE ?
      `);
      const booked = query.all(centerId, specialty, `${date}%`).map(a => a.appointment_date.split('T')[1].substring(0,5));
      return slots.filter(slot => !booked.includes(slot)).map(slot => `${date}T${slot}:00`);
    },
    
    createAppointment({ patientId, specialistId, centerId, specialty, date }) {
      const day = date.split('T')[0];
      const checkQuery = db.prepare(`
        SELECT id FROM appointments 
        WHERE patient_id = ? AND specialty = ? AND appointment_date LIKE ? AND status = 'CONFIRMED'
      `);
      const existing = checkQuery.get(patientId, specialty, `${day}%`);
      if (existing) {
        throw new Error('Ya existe una cita activa para esta especialidad en el mismo día.');
      }
      
      const id = uuidv4();
      const now = new Date().toISOString();
      const query = db.prepare(`
        INSERT INTO appointments (id, patient_id, specialist_id, center_id, specialty, appointment_date, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)
      `);
      query.run(id, patientId, specialistId || 'SPEC-1', centerId, specialty, date, now, now);
      return { id, patientId, specialistId, centerId, specialty, date, status: 'CONFIRMED' };
    },
    
    getPatientAppointments(patientId) {
       return db.prepare(`SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC`).all(patientId);
    },

    cancelAppointment(id, patientId) {
      const query = db.prepare(`
        UPDATE appointments SET status = 'CANCELLED', updated_at = ?
        WHERE id = ? AND patient_id = ? AND status = 'CONFIRMED'
      `);
      const info = query.run(new Date().toISOString(), id, patientId);
      if (info.changes === 0) {
        throw new Error('Cita no encontrada o ya cancelada/completada');
      }
      return true;
    },

    rescheduleAppointment(id, patientId, newDate) {
      db.exec('BEGIN TRANSACTION');
      try {
        const check = db.prepare(`SELECT * FROM appointments WHERE id = ? AND patient_id = ? AND status = 'CONFIRMED'`).get(id, patientId);
        if (!check) throw new Error('Cita no encontrada o no está confirmada');
        
        const day = newDate.split('T')[0];
        const existing = db.prepare(`
          SELECT id FROM appointments 
          WHERE patient_id = ? AND specialty = ? AND appointment_date LIKE ? AND status = 'CONFIRMED' AND id != ?
        `).get(patientId, check.specialty, `${day}%`, id);
        
        if (existing) {
          throw new Error('Ya existe una cita activa para esta especialidad en el mismo día.');
        }

        const update = db.prepare(`
          UPDATE appointments SET appointment_date = ?, updated_at = ?
          WHERE id = ?
        `);
        update.run(newDate, new Date().toISOString(), id);
        
        db.exec('COMMIT');
        return { ...check, appointment_date: newDate };
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    }
  };
}
