import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/status', AuthController.status);
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/me', requireAuth, AuthController.me);

export default router;

