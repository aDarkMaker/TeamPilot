import Router from '@koa/router';
import { buildApplicationRoutes } from '../application.routes';
import { buildAdminRoutes } from '../admin.routes';
import { buildAuthRoutes } from '../auth.routes';
import { buildProfileRoutes } from '../profile.routes';
import { registerHealthRoutes } from './health.routes';
import type { ApiRouteDeps } from './types';

function mountChildRouter(parent: Router, child: Router): void {
	parent.use(child.routes());
	parent.use(child.allowedMethods());
}

export function composeApiRouter(deps: ApiRouteDeps): Router {
	const api = new Router({ prefix: '/api' });

	registerHealthRoutes(api);

	mountChildRouter(api, buildAuthRoutes(deps.authController));
	mountChildRouter(api, buildApplicationRoutes(deps.applicationController));
	mountChildRouter(api, buildAdminRoutes(deps.adminController));
	mountChildRouter(api, buildProfileRoutes(deps.profileController));

	return api;
}
