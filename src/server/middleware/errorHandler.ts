import type { Middleware } from 'koa';
import { ZodError } from 'zod';
import { AppError } from '../types/api';

export const errorHandler: Middleware = async (ctx, next) => {
	try {
		await next();
	} catch (err: unknown) {
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
		ctx.status = 500;
		ctx.body = { ok: false, code: 'INTERNAL_ERROR', message: 'INTERNAL_SERVER_ERROR' };
	}
};