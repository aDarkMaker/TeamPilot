import Router from '@koa/router';
import { requireSuperAdmin, requireAdminOrAbove } from '../middleware/requireRole';
import type { AdminController } from '../controller/admin.controller';

export function buildAdminRoutes(controller: AdminController): Router {
	const router = new Router({ prefix: '/users' });

	router.get('/', requireAdminOrAbove, controller.listUsers);

	router.post('/:id/disable', requireAdminOrAbove, controller.disableUser);

	router.post('/:id/appoint-admin', requireSuperAdmin, controller.appointAdmin);
	router.post('/:id/revoke-admin', requireSuperAdmin, controller.revokeAdmin);
	
	return router;
}
