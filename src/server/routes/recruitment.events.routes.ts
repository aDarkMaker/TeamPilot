import Router from '@koa/router';

import { requireAdminOrAbove } from '../middleware/requireRole';
import type { RecruitmentEventsController } from '../controller/recruitmentEvents.controller';

export function buildRecruitmentEventsRoutes(controller: RecruitmentEventsController): Router {
	const router = new Router({ prefix: '/recruitment' });

	router.get('/events', requireAdminOrAbove, controller.stream);

	return router;
}
