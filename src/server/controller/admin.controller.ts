import type { Context } from 'koa';
import type { AdminService } from '../services/admin.service';

export class AdminController {
	constructor(private service: AdminService) {}

	appointAdmin = async (ctx: Context) => {
		await this.service.appointAdmin(ctx.params.id);
		ctx.body = { ok: true, data: { id: ctx.params.id, role: 'admin' } };
	};
}
