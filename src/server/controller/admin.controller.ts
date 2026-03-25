import type { Context } from 'koa';
import type { AdminService } from '../services/admin.service';

export class AdminController {
	constructor(private service: AdminService) {}

	listUsers = async (ctx: Context) => {
		const users = await this.service.listUsers();
		ctx.body = { ok: true, data: users };
	};

	appointAdmin = async (ctx: Context) => {
		await this.service.appointAdmin(ctx.params.id);
		ctx.body = { ok: true, data: { id: ctx.params.id, role: 'admin' } };
	};

	revokeAdmin = async (ctx: Context) => {
		await this.service.revokeAdmin(ctx.params.id);
		ctx.body = { ok: true, data: { id: ctx.params.id, role: 'user' } };
	};

	disableUser = async (ctx: Context) => {
		await this.service.disableUser(ctx.params.id, ctx.state.user!.role);
		ctx.body = { ok: true, data: { id: ctx.params.id, status: 'disabled' } };
	};
}
