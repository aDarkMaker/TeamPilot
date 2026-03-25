import type { Middleware } from 'koa';
import { verifyAccessToken } from '../auth/jwt';

export const authMiddleware: Middleware = async (ctx, next) => {
	const auth = ctx.headers.authorization;
	const tokenFromHeader = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
	const tokenFromCookie = ctx.cookies.get('access_token')?.trim() ?? '';
	const token = tokenFromHeader || tokenFromCookie;

	if (token) {
		try {
			const payload = verifyAccessToken(token);
			ctx.state.user = {
				id: payload.sub,
				username: payload.username,
				role: payload.role,
			};
		} catch {
			// Ignore Invalid Token Errors
		}
	}

	await next();
};