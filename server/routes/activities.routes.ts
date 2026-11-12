import { Router } from 'express';
import { ActivitiesController } from '../controllers/activities.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/status', ActivitiesController.status);
router.get('/', requireAuth, ActivitiesController.listActivities);
router.post('/', requireAuth, ActivitiesController.recordActivity);

export default router;
