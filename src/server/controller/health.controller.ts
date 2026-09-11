import type { Context } from 'koa';
import type { HealthService } from '../services/health.service';

export class HealthController {
	constructor(private service: HealthService) {}

	check = async (ctx: Context) => {
		await this.service.check();
		ctx.body = { ok: true, data: { status: 'ok' } };
	};
}
