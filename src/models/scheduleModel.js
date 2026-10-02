import { v4 as uuidv4 } from 'uuid';

export function createScheduleModel(db) {
  return {
    addBlock({ specialistId, type, startDate, endDate, durationMinutes = 30 }) {
      const id = uuidv4();
      const now = new Date().toISOString();
      db.exec('BEGIN TRANSACTION');
      try {
        const query = db.prepare(`
          INSERT INTO schedules (id, specialist_id, type, start_date, end_date, duration_minutes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        query.run(id, specialistId, type, startDate, endDate, durationMinutes, now);

        if (type !== 'WORKING_HOURS') {
          const affected = db.prepare(`
            SELECT id FROM appointments 
            WHERE specialist_id = ? AND status = 'CONFIRMED' 
              AND appointment_date >= ? AND appointment_date <= ?
          `).all(specialistId, startDate, `${endDate}T23:59:59`);
          
          if (affected.length > 0) {
            console.log(`NOTIFICACIÓN: El nuevo bloqueo afecta a ${affected.length} cita(s). Se requiere reprogramación.`);
            const updateStmt = db.prepare(`UPDATE appointments SET status = 'REQUIRES_RESCHEDULE', updated_at = ?, version = version + 1 WHERE id = ?`);
            for (const row of affected) {
              updateStmt.run(now, row.id);
            }
          }
        }
        db.exec('COMMIT');
        return { id, specialistId, type, startDate, endDate, durationMinutes };
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    
    getBlocks(specialistId) {
      return db.prepare(`SELECT * FROM schedules WHERE specialist_id = ? ORDER BY start_date ASC`).all(specialistId);
    },
    
    deleteBlock(id, specialistId) {
      const info = db.prepare(`DELETE FROM schedules WHERE id = ? AND specialist_id = ?`).run(id, specialistId);
      if (info.changes === 0) throw new Error('Bloqueo no encontrado');
      return true;
    }
  };
}
