import type { Context } from 'koa';
import type { RecruitmentService } from '../services/recruitment.service';

export class RecruitmentController {
	constructor(private service: RecruitmentService) {}

	submit = async (ctx: Context) => {
		const data = await this.service.submit(ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	listApplications = async (ctx: Context) => {
		const data = await this.service.listApplications(ctx.query);
		ctx.body = { ok: true, data };
	};

	getApplication = async (ctx: Context) => {
		const data = await this.service.getApplication(ctx.params.id);
		ctx.body = { ok: true, data };
	};

	listComments = async (ctx: Context) => {
		const data = await this.service.listComments(ctx.params.id, ctx.state.user!);
		ctx.body = { ok: true, data };
	};

	createComment = async (ctx: Context) => {
		const data = await this.service.createComment(ctx.params.id, ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	updateComment = async (ctx: Context) => {
		const data = await this.service.updateComment(ctx.params.commentId, ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	deleteComment = async (ctx: Context) => {
		await this.service.deleteComment(ctx.params.commentId, ctx.state.user!);
		ctx.body = { ok: true, data: { id: ctx.params.commentId } };
	};

	toggleLike = async (ctx: Context) => {
		const data = await this.service.toggleLike(ctx.params.commentId, ctx.state.user!);
		ctx.body = { ok: true, data };
	};

	addTag = async (ctx: Context) => {
		const data = await this.service.addTag(ctx.params.id, ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	removeTag = async (ctx: Context) => {
		const tag = typeof ctx.query.tag === 'string' ? ctx.query.tag : '';
		await this.service.removeTag(ctx.params.id, ctx.state.user!, tag);
		ctx.body = { ok: true, data: { applicationId: ctx.params.id } };
	};

	deleteApplication = async (ctx: Context) => {
		const data = await this.service.deleteApplication(ctx.params.id);
		ctx.body = { ok: true, data };
	};
}