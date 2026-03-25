import type { Context } from 'koa';
import type { AuthService } from '../services/auth.service';

const COOKIE_NAME = 'access_token';
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export class AuthController {
	constructor(private service: AuthService) {}

	login = async (ctx: Context) => {
		const result = await this.service.login(ctx.request.body);

		ctx.cookies.set(COOKIE_NAME, result.token, {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: MAX_AGE_SEC * 1000,
			path: '/',
		});

		ctx.body = {
			ok: true,
			data: {
				user: result.user,
			},
		};
	};
}