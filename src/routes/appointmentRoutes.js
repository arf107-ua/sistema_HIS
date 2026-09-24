import { Router } from 'express';
import { requirePatientSession } from '../middleware/auth.js';
import { createAppointmentController } from '../controllers/appointmentController.js';
import { createAppointmentModel } from '../models/appointmentModel.js';

export function createAppointmentRouter(db) {
  const router = Router();
  const appointmentModel = createAppointmentModel(db);
  const controller = createAppointmentController({ appointmentModel });

  router.get('/slots', controller.getAvailableSlots);
  router.post('/', requirePatientSession, controller.bookAppointment);
  router.get('/', requirePatientSession, controller.getPatientAppointments);
  router.delete('/:id', requirePatientSession, controller.cancelAppointment);
  router.put('/:id', requirePatientSession, controller.rescheduleAppointment);

  return router;
}
