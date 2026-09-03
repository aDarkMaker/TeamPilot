import type { Context } from 'koa';
import type { JoinusInterviewSlotsService } from '../services/joinusInterviewSlots.service';

export class JoinusInterviewSlotsController {
	constructor(private service: JoinusInterviewSlotsService) {}

	listPublic = async (ctx: Context) => {
		const data = await this.service.listPublic();
		ctx.body = { ok: true, data };
	};

	listWindows = async (ctx: Context) => {
		const data = await this.service.listWindows();
		ctx.body = { ok: true, data };
	};

	createWindow = async (ctx: Context) => {
		const data = await this.service.create(ctx.request.body);
		ctx.body = { ok: true, data };
	};

	deleteWindow = async (ctx: Context) => {
		const data = await this.service.remove(ctx.params.windowId);
		ctx.body = { ok: true, data };
	};
}
