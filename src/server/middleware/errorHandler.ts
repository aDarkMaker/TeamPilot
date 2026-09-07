import type { Middleware } from 'koa';
import { ZodError } from 'zod';
import { AppError } from '../types/api';

function isBenignNetworkError(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false;
	const anyErr = err as any;
	const code = typeof anyErr.code === 'string' ? anyErr.code : '';
	const message = typeof anyErr.message === 'string' ? anyErr.message : '';
	if (code === 'ECONNRESET' || code === 'EPIPE' || code === 'ERR_STREAM_PREMATURE_CLOSE') return true;
	if (message.includes('Premature close')) return true;
	if (message.includes('aborted')) return true;
	return false;
}

const FILE_TOO_LARGE_MESSAGE = '附件太大了喵，要比 50MB 小哦～';

// formidable 上传超限会抛 FormidableError(httpCode 413, code 1009/1016)
function isFileTooLargeError(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false;
	const anyErr = err as any;
	if (anyErr.httpCode === 413) return true;
	if (anyErr.code === 1009 || anyErr.code === 1016) return true;
	const message = typeof anyErr.message === 'string' ? anyErr.message : '';
	return message.includes('maxFileSize') || message.includes('maxTotalFileSize');
}

export const errorHandler: Middleware = async (ctx, next) => {
	try {
		await next();
	} catch (err: unknown) {
		if (isBenignNetworkError(err) && (ctx.req.aborted || !ctx.res.writable)) {
			return;
		}
		if (isFileTooLargeError(err)) {
			ctx.status = 413;
			ctx.body = { ok: false, code: 'FILE_TOO_LARGE', message: FILE_TOO_LARGE_MESSAGE };
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
				message: err.issues.map((i) => i.message).join('；') || '提交的数据有点问题',
			};
			return;
		}
		console.error('[INTERNAL_ERROR]', err);
		ctx.status = 500;
		ctx.body = {
			ok: false,
			code: 'INTERNAL_ERROR',
			message: '服务器开小差了，稍后再试',
		};
	}
};
