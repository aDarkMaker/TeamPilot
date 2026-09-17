import type { Context } from 'koa';
import type { AuthService } from '../services/auth.service';

const COOKIE_NAME = 'access_token';
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function setAccessTokenCookie(ctx: Context, value: string, maxAge: number) {
	// TLS terminates at the host edge; the app hop is plain HTTP. Force the
	// Secure attribute in production so cookies() does not require ctx.secure.
	const secure = process.env.NODE_ENV === 'production';
	if (secure) ctx.cookies.secure = true;
	ctx.cookies.set(COOKIE_NAME, value, {
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge,
		path: '/',
	});
}

export class AuthController {
	constructor(private service: AuthService) {}

	login = async (ctx: Context) => {
		const result = await this.service.login(ctx.request.body);

		setAccessTokenCookie(ctx, result.token, MAX_AGE_SEC * 1000);

		ctx.body = {
			ok: true,
			data: {
				user: result.user,
				passwordWasResetToDefault: result.passwordWasResetToDefault,
			},
		};
	};

	logout = async (ctx: Context) => {
		setAccessTokenCookie(ctx, '', 0);
		ctx.body = { ok: true, data: { status: 'ok' } };
	};
}
