import type { Middleware } from 'koa';
import { ZodError } from 'zod';
import { AppError } from '../types/api';

function isBenignNetworkError(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false;
	const anyErr = err as any;
	const code = typeof anyErr.code === 'string' ? anyErr.code : '';
	const message = typeof anyErr.message === 'string' ? anyErr.message : '';

	// Common cases when the client disconnects mid-request or the connection is reset.
	if (code === 'ECONNRESET' || code === 'EPIPE' || code === 'ERR_STREAM_PREMATURE_CLOSE') return true;
	if (message.includes('Premature close')) return true;
	if (message.includes('aborted')) return true;
	return false;
}

export const errorHandler: Middleware = async (ctx, next) => {
	try {
		await next();
	} catch (err: unknown) {
		// If the client has already disconnected, there's nothing meaningful to return.
		// Avoid logging noisy errors like "Premature close" during refresh/restart.
		if (isBenignNetworkError(err) && (ctx.req.aborted || !ctx.res.writable)) {
			return;
		}
		if (err instanceof AppError) {
			ctx.status = err.status;
			ctx.body = { ok: false, code: err.code, message: err.message };
			return;
		}
		if (err instanceof ZodError) {
			ctx.status = 400;
			ctx.body = {
				ok: false,
				code: 'VALIDATION_ERROR',
				message: err.issues.map((i) => i.message).join('; ') || 'INVALID_REQUEST_BODY',
			};
			return;
		}
		console.error('[INTERNAL_ERROR]', err);
		ctx.status = 500;
		ctx.body = {
			ok: false,
			code: 'INTERNAL_ERROR',
			message: err instanceof Error ? err.message : 'INTERNAL_SERVER_ERROR',
		};
	}
};