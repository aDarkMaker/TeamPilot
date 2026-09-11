import type Router from '@koa/router';
import type { HealthController } from '../../controller/health.controller';

export function registerHealthRoutes(api: Router, controller: HealthController): void {
	api.get('/health', controller.check);
}
