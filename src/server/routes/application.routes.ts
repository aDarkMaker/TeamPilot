import Router from '@koa/router';
import { requireAdminOrAbove } from '../middleware/requireRole';
import type { ApplicationController } from '../controller/application.controller';

export function buildApplicationRoutes(controller: ApplicationController): Router {
	const router = new Router({ prefix: '/application' });

	router.post('/', controller.submit);
	router.get('/pending', requireAdminOrAbove, controller.listPending);
	router.post('/:id/approve', requireAdminOrAbove, controller.approve);
	router.post('/:id/reject', requireAdminOrAbove, controller.reject);

	return router;
}
