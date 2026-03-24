import Router from '@koa/router';
import { requireSuperAdmin } from '../middleware/requireRole';
import type { AdminController } from '../controller/admin.controller';

export function buildAdminRoutes(controller: AdminController): Router {
	const router = new Router({ prefix: '/users' });

	router.post('/:id/appoint-admin', requireSuperAdmin, controller.appointAdmin);

	return router;
}
