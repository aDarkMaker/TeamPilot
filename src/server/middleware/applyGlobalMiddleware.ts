import type Koa from 'koa';
import { koaBody } from 'koa-body';
import { errorHandler } from './errorHandler';
import { corsMiddleware } from './cors';
import { authMiddleware } from './auth';

export function applyGlobalMiddleware(app: Koa): void {
	app.use(errorHandler);
	app.use(corsMiddleware);
	app.use(
		koaBody({
			multipart: true,
			formidable: {
				maxFileSize: 20 * 1024 * 1024,
				keepExtensions: true,
			},
			jsonLimit: '1mb',
		})
	);
	app.use(authMiddleware);
}