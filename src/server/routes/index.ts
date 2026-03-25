import Router from '@koa/router';
import { buildApplicationRoutes } from './application.routes';
import { buildAdminRoutes } from './admin.routes';
import { buildAuthRoutes } from './auth.routes';
import type { ApplicationController } from '../controller/application.controller';
import type { AdminController } from '../controller/admin.controller';
import type { AuthController } from '../controller/auth.controller';

export function buildRoutes(controllers: {
	applicationController: ApplicationController;
	adminController: AdminController;
	authController: AuthController;
}): Router {
	const root = new Router({ prefix: '/api' });

	root.get('/health', (ctx) => {
		ctx.body = { ok: true, data: { status: 'ok' } };
	});

	root.use(buildAuthRoutes(controllers.authController).routes());
	root.use(buildAuthRoutes(controllers.authController).allowedMethods());

	root.use(buildApplicationRoutes(controllers.applicationController).routes());
	root.use(buildApplicationRoutes(controllers.applicationController).allowedMethods());

	root.use(buildAdminRoutes(controllers.adminController).routes());
	root.use(buildAdminRoutes(controllers.adminController).allowedMethods());

	return root;
}