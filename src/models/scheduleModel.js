import { v4 as uuidv4 } from 'uuid';

export function createScheduleModel(db) {
  return {
    addBlock({ specialistId, type, startDate, endDate, durationMinutes = 30 }) {
      const id = uuidv4();
      const now = new Date().toISOString();
      const query = db.prepare(`
        INSERT INTO schedules (id, specialist_id, type, start_date, end_date, duration_minutes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      query.run(id, specialistId, type, startDate, endDate, durationMinutes, now);
      return { id, specialistId, type, startDate, endDate, durationMinutes };
    },
    
    getBlocks(specialistId) {
      return db.prepare(`SELECT * FROM schedules WHERE specialist_id = ? ORDER BY start_date ASC`).all(specialistId);
    }
  };
}
