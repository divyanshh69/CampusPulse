import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Rate limiter for authentication attempts (15 attempts per minute)
const authLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: 'Too many authentication attempts. Please wait 60 seconds before retrying.',
});

router.get('/status', AuthController.status);
router.post('/login', authLimiter, AuthController.login);
router.post('/register', authLimiter, AuthController.register);
router.get('/me', requireAuth, AuthController.me);
router.post('/change-password', requireAuth, authLimiter, AuthController.changePassword);

export default router;
