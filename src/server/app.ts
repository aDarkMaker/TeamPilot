import Koa from 'koa';

import { applyGlobalMiddleware } from './middleware/applyGlobalMiddleware';
import { isBenignNetworkError } from './middleware/errorHandler';
import { mountStaticFiles } from './lib/staticServe';
import { composeApiRouter } from './routes';
import type { Container } from './container';
import type { Socket } from 'node:net';

export function createApp(container: Container): Koa {
	const app = new Koa();
	app.proxy = true;
	applyGlobalMiddleware(app);

	const apiRouter = composeApiRouter(container.controllers);
	app.use(apiRouter.routes());
	app.use(apiRouter.allowedMethods());

	mountStaticFiles(app);
	return app;
}

/** Suppress the noisy errors caused by clients disconnecting during a reload or restart */
export function handleClientError(err: Error, socket: Socket): void {
	if (!isBenignNetworkError(err)) console.error('[CLIENT_ERROR]', err);
	socket.destroy();
}
