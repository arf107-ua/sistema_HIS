export function createAppointmentController({ appointmentModel }) {
  return {
    async getAvailableSlots(req, res, next) {
      try {
        const { specialty, centerId, date } = req.query;
        if (!specialty || !centerId || !date) {
          return res.status(400).json({ error: 'Missing parameters' });
        }
        const slots = appointmentModel.findAvailableSlots(specialty, centerId, date);
        res.json({ slots });
      } catch (err) {
        next(err);
      }
    },
    async bookAppointment(req, res, next) {
      try {
        const { specialistId, centerId, specialty, date } = req.body;
        const patientId = req.patient.id;
        const appointment = appointmentModel.createAppointment({
          patientId, specialistId, centerId, specialty, date
        });
        res.status(201).json({ appointment });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    },
    async getPatientAppointments(req, res, next) {
      try {
        const patientId = req.patient.id;
        const appointments = appointmentModel.getPatientAppointments(patientId);
        res.json({ appointments });
      } catch (err) {
        next(err);
      }
    },
    async cancelAppointment(req, res, next) {
      try {
        const { id } = req.params;
        const patientId = req.patient.id;
        appointmentModel.cancelAppointment(id, patientId);
        res.json({ success: true });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    },
    async rescheduleAppointment(req, res, next) {
      try {
        const { id } = req.params;
        const patientId = req.patient.id;
        const { newDate } = req.body;
        const appointment = appointmentModel.rescheduleAppointment(id, patientId, newDate);
        res.json({ appointment });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    }
  };
}
