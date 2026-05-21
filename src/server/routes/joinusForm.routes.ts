import Router from '@koa/router';
import { requireLogin, requireAdminOrAbove } from '../middleware/requireRole';
import type { JoinusFormController } from '../controller/joinusForm.controller';

export function buildJoinUsFormRoutes(controller: JoinusFormController): Router {
	const router = new Router({ prefix: '/joinus' });

	router.get('/form', requireLogin, requireAdminOrAbove, controller.getForm);
	router.put('/form', requireLogin, requireAdminOrAbove, controller.updateForm);

	return router;
}
