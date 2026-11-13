import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public status route
router.get('/status', NotificationsController.status);

// Protected routes (authenticated user only)
router.get('/unread-count', requireAuth, NotificationsController.getUnreadCount);
router.patch('/read-all', requireAuth, NotificationsController.markAllAsRead);
router.get('/', requireAuth, NotificationsController.listNotifications);
router.patch('/:id/read', requireAuth, NotificationsController.markAsRead);
router.delete('/:id', requireAuth, NotificationsController.deleteNotification);

export default router;

