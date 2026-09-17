import { z } from 'zod';

import type { DB } from '../db';
import { canDeleteOthersComment } from '../auth/rbac';
import { failRecruitment } from '../lib/recruitmentErrors';
import type { Role } from '../types/auth';

const commentBodySchema = z.object({
	bodyMarkdown: z.string().trim().min(1).max(12000),
});

export class RecruitmentCommentService {
	constructor(private db: DB) {}

	listComments(applicationId: string, viewer: { id: string }) {
		return this.db.listRecruitmentComments(applicationId, viewer.id);
	}

	async createComment(applicationId: string, user: { id: string }, body: unknown) {
		const app = await this.db.findRecruitmentApplicationById(applicationId);
		if (!app) failRecruitment('APPLICATION_NOT_FOUND');

		const p = commentBodySchema.parse(body);
		return this.db.createRecruitmentComment({
			applicationId,
			authorId: user.id,
			bodyMarkdown: p.bodyMarkdown,
		});
	}

	async updateComment(commentId: string, user: { id: string }, body: unknown) {
		const p = commentBodySchema.parse(body);
		try {
			return await this.db.updateRecruitmentComment({
				commentId,
				authorId: user.id,
				bodyMarkdown: p.bodyMarkdown,
			});
		} catch (e) {
			if (e instanceof Error && e.message === 'COMMENT_NOT_FOUND_OR_FORBIDDEN') failRecruitment('FORBIDDEN');
			throw e;
		}
	}

	async deleteComment(commentId: string, actor: { id: string; role: Role }) {
		const meta = await this.db.findRecruitmentCommentMeta(commentId);
		if (!meta) failRecruitment('COMMENT_NOT_FOUND');
		if (meta.authorId !== actor.id && !canDeleteOthersComment(actor.role, meta.authorRole)) {
			failRecruitment('FORBIDDEN');
		}
		await this.db.deleteRecruitmentComment(commentId);
	}

	async toggleLike(commentId: string, user: { id: string }) {
		const meta = await this.db.findRecruitmentCommentMeta(commentId);
		if (!meta) failRecruitment('COMMENT_NOT_FOUND');
		return this.db.toggleRecruitmentCommentLike({ commentId, userId: user.id });
	}
}
