import type { Middleware } from 'koa';
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
		ctx.status = 500;
		ctx.body = { ok: false, code: 'INTERNAL_ERROR', message: 'INTERNAL_SERVER_ERROR' };
	}
};
