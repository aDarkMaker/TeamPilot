import type { Context } from 'koa';
import type { JoinUsFormService } from '../services/joinusForm.service';

export class JoinusFormController {
	constructor(private service: JoinUsFormService) {}

	getForm = async (ctx: Context) => {
		const data = await this.service.getForm();
		ctx.body = { ok: true, data };
	};

	updateForm = async (ctx: Context) => {
		const data = await this.service.updateForm(ctx.request.body);
		ctx.body = { ok: true, data };
	};
}
