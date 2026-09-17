import type { Context } from 'koa';

import type { AnnouncementService } from '../services/announcement.service';
import type { BiliDynamicService } from '../services/biliDynamic.service';
import type { BiliImageProxyService } from '../services/biliImageProxy.service';
import type { BirthdayService } from '../services/birthday.service';

export type HomeServices = {
	announcement: AnnouncementService;
	birthday: BirthdayService;
	biliDynamic: BiliDynamicService;
	biliImage: BiliImageProxyService;
};

export class HomeController {
	constructor(private services: HomeServices) {}

	listAnnouncements = async (ctx: Context) => {
		const limit = Number(ctx.query.limit ?? 3);
		const data = await this.services.announcement.listAnnouncements(Number.isFinite(limit) ? limit : 3);
		ctx.body = { ok: true, data };
	};

	createAnnouncement = async (ctx: Context) => {
		const data = await this.services.announcement.createAnnouncement(ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	deleteAnnouncement = async (ctx: Context) => {
		await this.services.announcement.deleteAnnouncement(ctx.params.id);
		ctx.body = { ok: true, data: { id: ctx.params.id } };
	};

	setAnnouncementPinned = async (ctx: Context) => {
		const isPinned = Boolean((ctx.request.body as any)?.isPinned);
		await this.services.announcement.setAnnouncementPinned(ctx.params.id, isPinned);
		ctx.body = { ok: true, data: { id: ctx.params.id, isPinned } };
	};

	listBiliDynamics = async (ctx: Context) => {
		const data = await this.services.biliDynamic.listBiliDynamics();
		ctx.body = { ok: true, data };
	};

	listTodayBirthdays = async (ctx: Context) => {
		const data = await this.services.birthday.listTodayBirthdays();
		ctx.body = { ok: true, data };
	};

	listBirthdayWishes = async (ctx: Context) => {
		const recipientUserId = typeof ctx.query.recipientUserId === 'string' ? ctx.query.recipientUserId : '';
		const data = await this.services.birthday.listWishes(recipientUserId);
		ctx.body = { ok: true, data };
	};

	createBirthdayWish = async (ctx: Context) => {
		const data = await this.services.birthday.createWish(ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	proxyBiliImage = async (ctx: Context) => {
		const url = typeof ctx.query.url === 'string' ? ctx.query.url : '';
		if (!url) {
			ctx.status = 400;
			ctx.body = { ok: false, error: '缺少 url 参数' };
			return;
		}
		const { buffer, contentType } = await this.services.biliImage.proxyBiliImage(url);
		ctx.type = contentType;
		ctx.set('Cache-Control', 'public, max-age=86400');
		ctx.body = buffer;
	};
}
