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
}
