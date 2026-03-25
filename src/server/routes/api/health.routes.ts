import type Router from '@koa/router';

export function registerHealthRoutes(api: Router): void {
	api.get('/health', (ctx) => {
		ctx.body = { ok: true, data: { status: 'ok' } };
	});
}
