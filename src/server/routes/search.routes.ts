import Router from '@koa/router';
import { requireLogin } from '../middleware/requireRole';
import type { SearchController } from '../controller/search.controller';

export function buildSearchRoutes(controller: SearchController): Router {
	const router = new Router({ prefix: '/search' });

	router.get('/', requireLogin, controller.search);

	return router;
}
