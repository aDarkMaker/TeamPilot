import Router from '@koa/router';
import { requireLogin, requireAdminOrAbove } from '../middleware/requireRole';
import type { HomeController } from '../controller/home.controller';

export function buildHomeRoutes(controller: HomeController): Router {
	const router = new Router({ prefix: '/home' });

	router.get('/announcements', requireLogin, controller.listAnnouncements);
	router.post('/announcements', requireAdminOrAbove, controller.createAnnouncement);
	router.patch('/announcements/:id/pin', requireAdminOrAbove, controller.setAnnouncementPinned);
	router.delete('/announcements/:id', requireAdminOrAbove, controller.deleteAnnouncement);

	router.get('/bili-dynamics', requireLogin, controller.listBiliDynamics);

	return router;
}
