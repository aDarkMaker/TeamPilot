import type { Context } from 'koa';

import type { RecruitmentService } from '../services/recruitment.service';
import type { RecruitmentCommentService } from '../services/recruitmentComment.service';
import type { RecruitmentRatingService } from '../services/recruitmentRating.service';
import type { RecruitmentTagService } from '../services/recruitmentTag.service';

export type RecruitmentServices = {
	application: RecruitmentService;
	comment: RecruitmentCommentService;
	tag: RecruitmentTagService;
	rating: RecruitmentRatingService;
};

export class RecruitmentController {
	constructor(private services: RecruitmentServices) {}

	listApplications = async (ctx: Context) => {
		const data = await this.services.application.listApplications(ctx.query, ctx.state.user!.id);
		ctx.body = { ok: true, data };
	};

	setApplicationRating = async (ctx: Context) => {
		const data = await this.services.rating.setApplicationRating(ctx.params.id, ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	getApplication = async (ctx: Context) => {
		const data = await this.services.application.getApplication(ctx.params.id);
		ctx.body = { ok: true, data };
	};

	listComments = async (ctx: Context) => {
		const data = await this.services.comment.listComments(ctx.params.id, ctx.state.user!);
		ctx.body = { ok: true, data };
	};

	createComment = async (ctx: Context) => {
		const data = await this.services.comment.createComment(ctx.params.id, ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	updateComment = async (ctx: Context) => {
		const data = await this.services.comment.updateComment(ctx.params.commentId, ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	deleteComment = async (ctx: Context) => {
		await this.services.comment.deleteComment(ctx.params.commentId, ctx.state.user!);
		ctx.body = { ok: true, data: { id: ctx.params.commentId } };
	};

	toggleLike = async (ctx: Context) => {
		const data = await this.services.comment.toggleLike(ctx.params.commentId, ctx.state.user!);
		ctx.body = { ok: true, data };
	};

	addTag = async (ctx: Context) => {
		const data = await this.services.tag.addTag(ctx.params.id, ctx.state.user!, ctx.request.body);
		ctx.body = { ok: true, data };
	};

	removeTag = async (ctx: Context) => {
		const tag = typeof ctx.query.tag === 'string' ? ctx.query.tag : '';
		await this.services.tag.removeTag(ctx.params.id, ctx.state.user!, tag);
		ctx.body = { ok: true, data: { applicationId: ctx.params.id } };
	};

	deleteApplication = async (ctx: Context) => {
		const data = await this.services.application.deleteApplication(ctx.params.id);
		ctx.body = { ok: true, data };
	};
}
