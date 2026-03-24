import type { Middleware } from 'koa';
import { verifyAccessToken } from '../auth/jwt';

export const authMiddleware: Middleware = async (ctx, next) => {
	const auth = ctx.headers.authorization;
	if (!auth?.startsWith('Bearer ')) {
		await next();
		return;
	}

	const token = auth.slice('Bearer '.length).trim();
	if (!token) {
		await next();
		return;
	}

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

	await next();
};
