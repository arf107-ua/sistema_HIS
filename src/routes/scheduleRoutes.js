import { Router } from 'express';
import { requireAdminSession } from '../middleware/auth.js';
import { createScheduleController } from '../controllers/scheduleController.js';
import { createScheduleModel } from '../models/scheduleModel.js';

export function createScheduleRouter(db) {
  const router = Router();
  const scheduleModel = createScheduleModel(db);
  const controller = createScheduleController({ scheduleModel });

  router.post('/blocks', requireAdminSession, controller.addBlock);
  router.get('/blocks', requireAdminSession, controller.getBlocks);

  return router;
}
