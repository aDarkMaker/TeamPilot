import type { Context } from 'koa';
import type { ScheduleService } from '../services/schedule.service';

export class ScheduleController {
	constructor(private service: ScheduleService) {}

	create = async (ctx: Context) => {
		const data = await this.service.create(ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	update = async (ctx: Context) => {
		const data = await this.service.update(ctx.state.user!, ctx.params.id, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	cancel = async (ctx: Context) => {
		await this.service.cancel(ctx.state.user!, ctx.params.id);
		ctx.body = { ok: true, data: { id: ctx.params.id, status: 'cancelled' } };
	};

	listByDay = async (ctx: Context) => {
		const data = await this.service.listByDay(ctx.state.user!, ctx.request.query);
		ctx.body = { ok: true, data };
	};

	listByWeek = async (ctx: Context) => {
		const data = await this.service.listByWeek(ctx.state.user!, ctx.request.query);
		ctx.body = { ok: true, data };
	};

	searchUsers = async (ctx: Context) => {
		const data = await this.service.searchUsers(ctx.request.query);
		ctx.body = { ok: true, data };
	};
}
