import Router from '@koa/router';
import { requireAdminOrAbove } from '../middleware/requireRole';
import type { JoinusInterviewSlotsController } from '../controller/joinusInterviewSlots.controller';

export function buildJoinUsInterviewSlotsRoutes(controller: JoinusInterviewSlotsController): Router {
	const router = new Router({ prefix: '/joinus' });

	router.get('/timeslots-public', controller.listPublic);
	router.get('/timeslots', requireAdminOrAbove, controller.listWindows);
	router.post('/timeslots', requireAdminOrAbove, controller.createWindow);
	router.delete('/timeslots/:windowId', requireAdminOrAbove, controller.deleteWindow);

	return router;
}
