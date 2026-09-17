import { z } from 'zod';

import type { DB } from '../db';
import { canReviewApplication } from '../auth/rbac';
import { failRecruitment } from '../lib/recruitmentErrors';
import type { Role } from '../types/auth';

const CJK_TAG = /^[\u4e00-\u9fff]{1,2}$/;

const tagValueSchema = z.string().trim().regex(CJK_TAG, '标签为 1～2 个汉字');

const addTagSchema = z.object({ tag: tagValueSchema });

export class RecruitmentTagService {
	constructor(private db: DB) {}

	async addTag(applicationId: string, actor: { id: string }, body: unknown) {
		const app = await this.db.findRecruitmentApplicationById(applicationId);
		if (!app) failRecruitment('APPLICATION_NOT_FOUND');

		const p = addTagSchema.parse(body);
		await this.db.addRecruitmentApplicationTag({ applicationId, tag: p.tag, createdBy: actor.id });
		return this.db.listRecruitmentApplicationTags(applicationId);
	}

	async removeTag(applicationId: string, actor: { id: string; role: Role }, tagRaw: string) {
		const app = await this.db.findRecruitmentApplicationById(applicationId);
		if (!app) failRecruitment('APPLICATION_NOT_FOUND');

		const tag = tagValueSchema.parse(tagRaw);
		const createdBy = await this.db.findRecruitmentTagCreatedBy({ applicationId, tag });
		if (createdBy == null) failRecruitment('TAG_NOT_FOUND');

		// Reviewers may remove any tag; everyone else only their own.
		if (!canReviewApplication(actor.role) && createdBy !== actor.id) failRecruitment('FORBIDDEN');

		await this.db.removeRecruitmentApplicationTag({ applicationId, tag });
	}
}
