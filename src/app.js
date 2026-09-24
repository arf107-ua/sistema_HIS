import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { createPatientsRouter } from './routes/patients.js';
import { createAppointmentRouter } from './routes/appointmentRoutes.js';
import { createScheduleRouter } from './routes/scheduleRoutes.js';
import { openAndMigrate } from './db/connection.js';
import { createPatientRepository } from './repositories/patientRepository.js';
import { createPatientService } from './services/patientService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ db } = {}) {
  const database = db ?? openAndMigrate();
  const repository = createPatientRepository(database);
  const patientService = createPatientService({ repository });

  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/patients', createPatientsRouter({ patientService }));
  app.use('/api/appointments', createAppointmentRouter(database));
  app.use('/api/schedules', createScheduleRouter(database));

  app.use(errorHandler);
  return app;
}
