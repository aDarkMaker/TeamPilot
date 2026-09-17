import { z } from 'zod';

import type { DB } from '../db';
import { broadcastRecruitmentApplicationsUpdated } from '../recruitment/recruitmentEvents';
import { failRecruitment } from '../lib/recruitmentErrors';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';

const listQuerySchema = z.object({
	timeOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export class RecruitmentService {
	constructor(private db: DB) {}

	async listApplications(query: unknown, viewerUserId: string) {
		const q = listQuerySchema.parse(query);
		const apps = await this.db.listRecruitmentApplications({ timeOrder: q.timeOrder });
		const [summaries, myRatings] = await Promise.all([this.db.listRecruitmentRatingSummaries(), this.db.listRecruitmentRatingsByUser(viewerUserId)]);

		return Promise.all(
			apps.map(async (a) => {
				const summary = summaries.get(a.id);
				return {
					...a,
					tags: await this.db.listRecruitmentApplicationTags(a.id),
					ratingAverage: summary?.ratingAverage ?? null,
					ratingCount: summary?.ratingCount ?? 0,
					myRating: myRatings.get(a.id) ?? null,
				};
			})
		);
	}

	async getApplication(id: string) {
		const app = await this.db.findRecruitmentApplicationById(id);
		if (!app) failRecruitment('APPLICATION_NOT_FOUND');
		const tags = await this.db.listRecruitmentApplicationTags(id);
		return { ...app, tags };
	}

	async deleteApplication(applicationId: string): Promise<{ id: string }> {
		const app = await this.db.findRecruitmentApplicationById(applicationId);
		if (!app) failRecruitment('APPLICATION_NOT_FOUND');

		await this.db.deleteRecruitmentApplicationById(applicationId);
		await this.removeAttachmentDir(app.attachmentPath);

		broadcastRecruitmentApplicationsUpdated();
		return { id: applicationId };
	}

	/** Attachments live under data/joinus/<slug>/; drop that directory with the application */
	private async removeAttachmentDir(attachmentPath: string | null | undefined): Promise<void> {
		const first = (attachmentPath ?? '').trim().split('|')[0]?.trim() ?? '';
		if (!first.startsWith('joinus/')) return;

		const slug = first.split('/').filter(Boolean)[1] ?? '';
		if (!slug || !/^[a-z0-9_]+$/.test(slug)) return;

		const dir = join(process.cwd(), 'data', 'joinus', slug);
		await rm(dir, { recursive: true, force: true }).catch(() => undefined);
	}
}
