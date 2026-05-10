import type { Context } from 'koa';
import type { BilibiliService } from '../services/bilibili.service';
import { config } from '../config';

function isAllowed(username: string): boolean {
	const target = config.bili.loginTargetUsername;
	return !!target && username === target;
}

export class BilibiliController {
	constructor(private service: BilibiliService) {}

	private checkAllowed(ctx: Context): boolean {
		if (!isAllowed(ctx.state.user?.username ?? '')) {
			ctx.status = 403;
			ctx.body = { ok: false, error: '无权限' };
			return false;
		}
		return true;
	}

	generateQrcode = async (ctx: Context) => {
		if (!this.checkAllowed(ctx)) return;
		const data = await this.service.generateQrcode();
		ctx.body = { ok: true, data };
	};

	pollQrcode = async (ctx: Context) => {
		if (!this.checkAllowed(ctx)) return;
		const key = typeof ctx.query.qrcode_key === 'string' ? ctx.query.qrcode_key : '';
		if (!key) {
			ctx.status = 400;
			ctx.body = { ok: false, error: '缺少 qrcode_key 参数' };
			return;
		}
		const data = await this.service.pollQrcode(key);
		ctx.body = { ok: true, data };
	};

	bind = async (ctx: Context) => {
		if (!this.checkAllowed(ctx)) return;
		const { refresh_token, bili_uid, cookies } = ctx.request.body as any;
		if (!refresh_token) {
			ctx.status = 400;
			ctx.body = { ok: false, error: '缺少 refresh_token' };
			return;
		}
		const userId = ctx.state.user!.id;
		this.service.saveBind(userId, refresh_token, bili_uid ?? '', cookies ?? '');
		ctx.body = { ok: true, data: { bound: true } };
	};

	getStatus = async (ctx: Context) => {
		const userId = ctx.state.user!.id;
		const allowed = isAllowed(ctx.state.user?.username ?? '');
		if (!allowed) {
			ctx.body = { ok: true, data: { bound: false, allowed: false } };
			return;
		}
		try {
			const info = await this.service.fetchBiliUserInfo(userId);
			ctx.body = { ok: true, data: { bound: true, allowed: true, avatar: info.avatar, nickname: info.nickname } };
		} catch {
			const status = this.service.getBindStatus(userId);
			ctx.body = { ok: true, data: { bound: status.bound, allowed: true, avatar: null, nickname: null } };
		}
	};

	getUserInfo = async (ctx: Context) => {
		if (!this.checkAllowed(ctx)) return;
		const userId = ctx.state.user!.id;
		const data = await this.service.fetchBiliUserInfo(userId);
		ctx.body = { ok: true, data };
	};
}
