export function createScheduleController({ scheduleModel }) {
  return {
    async addBlock(req, res, next) {
      try {
        const { specialistId, type, startDate, endDate, durationMinutes } = req.body;
        // const adminId = req.admin.id; // validado por middleware
        if (!specialistId || !type || !startDate || !endDate) {
          return res.status(400).json({ error: 'Missing required parameters' });
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
    }
  };
}
