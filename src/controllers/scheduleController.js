export function createScheduleController({ scheduleModel }) {
  return {
    async addBlock(req, res, next) {
      try {
        const { specialistId, type, startDate, endDate, durationMinutes } = req.body;
        // const adminId = req.admin.id; // validado por middleware
        if (!specialistId || !type || !startDate || !endDate) {
          return res.status(400).json({ error: 'Missing required parameters' });
        }
        if (new Date(startDate) >= new Date(endDate)) {
          return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
        }
        const block = scheduleModel.addBlock({ specialistId, type, startDate, endDate, durationMinutes });
        res.status(201).json({ block });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    },
    async getBlocks(req, res, next) {
      try {
        const { specialistId } = req.query;
        if (!specialistId) return res.status(400).json({ error: 'Missing specialistId' });
        const blocks = scheduleModel.getBlocks(specialistId);
        res.json({ blocks });
      } catch (err) {
        next(err);
      }
    },
    async deleteBlock(req, res, next) {
      try {
        const { id } = req.params;
        const specialistId = req.query.specialistId || 'SPEC-1';
        if (!id) return res.status(400).json({ error: 'Missing id' });
        scheduleModel.deleteBlock(id, specialistId);
        res.json({ success: true });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    }
  };
}
