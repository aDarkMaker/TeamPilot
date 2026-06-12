import Router from '@koa/router';
import type { AuthController } from '../controller/auth.controller';

export function buildAuthRoutes(controller: AuthController): Router {
	const router = new Router({ prefix: '/auth' });

	router.post('/login', controller.login);
	router.post('/logout', controller.logout);

	return router;
}
