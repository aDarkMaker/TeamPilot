import Router from '@koa/router';
import { requireLogin } from '../middleware/requireRole';
import type { ProfileController } from '../controller/profile.controller';

export function buildProfileRoutes(controller: ProfileController): Router {
	const router = new Router({ prefix: '/users' });

	router.get('/me', requireLogin, controller.getMe);
	router.patch('/me', requireLogin, controller.patchMe);
	router.post('/me/password', requireLogin, controller.changePassword);
	router.post('/me/avatar', requireLogin, controller.uploadAvatar);
	router.post('/me/profile-background', requireLogin, controller.uploadProfileBackground);

	return router;
}