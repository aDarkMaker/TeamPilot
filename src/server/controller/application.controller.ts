import type { Context } from 'koa';
import type { ApplicationService } from '../services/application.service';

export class ApplicationController {
	constructor(private service: ApplicationService) {}

	submit = async (ctx: Context) => {
		const result = await this.service.submit(ctx.request.body);
		ctx.body = { ok: true, data: result };
	};

	listPending = async (ctx: Context) => {
		const result = await this.service.listPending();
		ctx.body = { ok: true, data: result };
	};

	approve = async (ctx: Context) => {
		await this.service.approve(ctx.params.id, ctx.state.user!.id);
		ctx.body = { ok: true, data: { id: ctx.params.id, status: 'approved' } };
	};

	reject = async (ctx: Context) => {
		await this.service.reject(ctx.params.id, ctx.state.user!.id);
		ctx.body = { ok: true, data: { id: ctx.params.id, status: 'rejected' } };
	};
}
