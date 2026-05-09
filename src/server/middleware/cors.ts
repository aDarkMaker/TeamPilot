import type { Middleware } from 'koa';

export const corsMiddleware: Middleware = async (ctx, next) => {
	ctx.set('Access-Control-Allow-Origin', 'https://huaxiaoke.com');
	ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	ctx.set('Access-Control-Allow-Headers', 'Content-Type');
	ctx.set('Access-Control-Allow-Credentials', 'true');

	if (ctx.method === 'OPTIONS') {
		ctx.status = 204;
		return;
	}

	await next();
};
