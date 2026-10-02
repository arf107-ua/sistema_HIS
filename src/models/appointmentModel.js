import { v4 as uuidv4 } from 'uuid';

export function createAppointmentModel(db) {
  return {
    findAvailableSlots(specialty, centerId, date) {
      const specialtyToSpec = {
        'Dermatología': 'SPEC-1',
        'Medicina General': 'SPEC-2',
        'Pediatría': 'SPEC-3'
      };
      const specId = specialtyToSpec[specialty] || 'SPEC-1';

      const config = db.prepare(`SELECT duration_minutes FROM schedules WHERE specialist_id = ? AND type = 'WORKING_HOURS' ORDER BY created_at DESC LIMIT 1`).get(specId);
      const duration = config ? config.duration_minutes : 30;

      const blocks = db.prepare(`
        SELECT type, start_date, end_date FROM schedules 
        WHERE specialist_id = ? AND (type = 'VACATION' OR type = 'SICK_LEAVE')
          AND start_date <= ? AND end_date >= ?
      `).all(specId, `${date}T23:59:59`, `${date}T00:00:00`);
      
      const slots = [];
      let current = new Date(`${date}T09:00:00`);
      const end = new Date(`${date}T14:00:00`);
      while (current < end) {
        const h = String(current.getHours()).padStart(2, '0');
        const m = String(current.getMinutes()).padStart(2, '0');
        slots.push({ time: `${date}T${h}:${m}:00`, available: true, reason: null });
        current.setMinutes(current.getMinutes() + duration);
      }

      const query = db.prepare(`
        SELECT appointment_date FROM appointments 
        WHERE center_id = ? AND specialty = ? AND status = 'CONFIRMED' AND appointment_date LIKE ?
      `);
      const booked = query.all(centerId, specialty, `${date}%`).map(a => a.appointment_date);

      slots.forEach(slot => {
        if (booked.some(b => b.startsWith(slot.time.substring(0, 16)))) {
          slot.available = false;
          slot.reason = 'Reservado';
          return;
        }
        const slotTime = new Date(slot.time);
        for (const block of blocks) {
          if (slotTime >= new Date(block.start_date) && slotTime < new Date(block.end_date)) {
            slot.available = false;
            slot.reason = block.type === 'VACATION' ? 'Vacaciones' : 'Baja Médica';
            break;
          }
        }
      });
      return slots;
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
        INSERT INTO appointments (id, patient_id, specialist_id, center_id, specialty, appointment_date, status, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', 0, ?, ?)
      `);
      const specialtyToSpec = {
        'Dermatología': 'SPEC-1',
        'Medicina General': 'SPEC-2',
        'Pediatría': 'SPEC-3'
      };
      const specId = specialistId || specialtyToSpec[specialty] || 'SPEC-1';

      try {
        query.run(id, patientId, specId, centerId, specialty, date, now, now);
      } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          throw new Error('Concurrencia: El hueco acaba de ser reservado por otro paciente.');
        }
        throw err;
      }
      return { id, patientId, specialistId, centerId, specialty, date, status: 'CONFIRMED', version: 0 };
    },
    
    getPatientAppointments(patientId) {
       return db.prepare(`
         SELECT * FROM appointments 
         WHERE patient_id = ? 
         ORDER BY CASE WHEN status IN ('CONFIRMED', 'REQUIRES_RESCHEDULE') THEN 0 ELSE 1 END ASC, appointment_date DESC
       `).all(patientId);
    },

    cancelAppointment(id, patientId) {
      const check = db.prepare(`SELECT appointment_date, version, status FROM appointments WHERE id = ? AND patient_id = ? AND status IN ('CONFIRMED', 'REQUIRES_RESCHEDULE')`).get(id, patientId);
      if (!check) throw new Error('Cita no encontrada o ya inactiva');

      const appDate = new Date(check.appointment_date);
      if (check.status !== 'REQUIRES_RESCHEDULE' && appDate - new Date() < 24 * 60 * 60 * 1000) {
        throw new Error('Solo se puede cancelar con al menos 24 horas de antelación.');
      }

      const query = db.prepare(`
        UPDATE appointments SET status = 'CANCELLED', version = version + 1, updated_at = ?
        WHERE id = ? AND version = ?
      `);
      const info = query.run(new Date().toISOString(), id, check.version);
      if (info.changes === 0) {
        throw new Error('Cita no encontrada o ya cancelada/completada');
      }
      return true;
    },

    rescheduleAppointment(id, patientId, newDate) {
      db.exec('BEGIN TRANSACTION');
      try {
        const check = db.prepare(`SELECT * FROM appointments WHERE id = ? AND patient_id = ? AND status IN ('CONFIRMED', 'REQUIRES_RESCHEDULE')`).get(id, patientId);
        if (!check) throw new Error('Cita no encontrada o no está activa');
        
        const appDate = new Date(check.appointment_date);
        if (check.status !== 'REQUIRES_RESCHEDULE' && appDate - new Date() < 24 * 60 * 60 * 1000) {
          throw new Error('Solo se puede reprogramar con al menos 24 horas de antelación.');
        }
        
        const day = newDate.split('T')[0];
        const existing = db.prepare(`
          SELECT id FROM appointments 
          WHERE patient_id = ? AND specialty = ? AND appointment_date LIKE ? AND status = 'CONFIRMED' AND id != ?
        `).get(patientId, check.specialty, `${day}%`, id);
        
        if (existing) {
          throw new Error('Ya existe una cita activa para esta especialidad en el mismo día.');
        }

        const update = db.prepare(`
          UPDATE appointments SET appointment_date = ?, status = 'CONFIRMED', version = version + 1, updated_at = ?
          WHERE id = ? AND version = ?
        `);
        const info = update.run(newDate, new Date().toISOString(), id, check.version);
        if (info.changes === 0) throw new Error('Concurrencia: La cita ha sido modificada por otro proceso.');
        
        db.exec('COMMIT');
        return { ...check, appointment_date: newDate };
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    }
  };
}
