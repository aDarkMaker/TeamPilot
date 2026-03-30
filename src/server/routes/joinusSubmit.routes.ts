import Router from '@koa/router';
import type { JoinusSubmitController } from '../controller/joinusSubmit.controller';

export function buildJoinUsSubmitRoutes(controller: JoinusSubmitController): Router {
	const router = new Router({ prefix: '/joinus' });
	router.post('/submit', controller.submitAnonymous);
	return router;
}