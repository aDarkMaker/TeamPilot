import type { Context } from 'koa';
import type { HomeService } from '../services/home.service';

export class HomeController {
	constructor(private service: HomeService) {}

	listAnnouncements = async (ctx: Context) => {
		const limit = Number(ctx.query.limit ?? 3);
		const data = await this.service.listAnnouncements(Number.isFinite(limit) ? limit : 3);
		ctx.body = { ok: true, data };
	};
	createAnnouncement = async (ctx: Context) => {
		const data = await this.service.createAnnouncement(ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};
	deleteAnnouncement = async (ctx: Context) => {
		await this.service.deleteAnnouncement(ctx.params.id);
		ctx.body = { ok: true, data: { id: ctx.params.id } };
	};
	setAnnouncementPinned = async (ctx: Context) => {
		const isPinned = Boolean((ctx.request.body as any)?.isPinned);
		await this.service.setAnnouncementPinned(ctx.params.id, isPinned);
		ctx.body = { ok: true, data: { id: ctx.params.id, isPinned } };
	};
	listBiliDynamics = async (ctx: Context) => {
		const data = await this.service.listBiliDynamics();
		ctx.body = { ok: true, data };
	};
	listTodayBirthdays = async (ctx: Context) => {
		const data = await this.service.listTodayBirthdays();
		ctx.body = { ok: true, data };
	}
	listBirthdayWishes = async (ctx: Context) => {
		const recipientUserId = typeof ctx.query.recipientUserId === 'string' ? ctx.query.recipientUserId : '';
		const data = await this.service.listWishes(recipientUserId);
		ctx.body = { ok: true, data };
	};
	
	createBirthdayWish = async (ctx: Context) => {
		const data = await this.service.createWish(ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	proxyBiliImage = async (ctx: Context) => {
		const url = typeof ctx.query.url === 'string' ? ctx.query.url : '';
		if (!url) {
			ctx.status = 400;
			ctx.body = { ok: false, error: '缺少 url 参数' };
			return;
		}
		const { buffer, contentType } = await this.service.proxyBiliImage(url);
		ctx.type = contentType;
		ctx.set('Cache-Control', 'public, max-age=86400');
		ctx.body = buffer;
	};
}
