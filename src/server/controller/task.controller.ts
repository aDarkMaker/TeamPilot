import type { Context } from 'koa';
import type { TaskService } from '../services/task.service';

export class TaskController {
	constructor(private service: TaskService) {}
	listMyTasks = async (ctx: Context) => {
		const data = await this.service.listMyTasks(ctx.state.user!, ctx.request.query);
		ctx.body = { ok: true, data };
	};
	countMyPending = async (ctx: Context) => {
		const count = await this.service.countMyPending(ctx.state.user!);
		ctx.body = { ok: true, data: { pending: count } };
	};
	decideMyTask = async (ctx: Context) => {
		const data = await this.service.decideMyTask(ctx.state.user!, ctx.params.id, ctx.request.body);
		ctx.body = { ok: true, data };
	};
}
