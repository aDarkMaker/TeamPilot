import { z } from 'zod';

import type { DB } from '../db';
import { broadcastRecruitmentApplicationsUpdated } from '../recruitment/recruitmentEvents';
import { failRecruitment } from '../lib/recruitmentErrors';

const ratingBodySchema = z.object({
	rating: z.number().refine((n) => n >= 0.5 && n <= 5 && Number.isInteger(Math.round(n * 2)), { message: '无效的评分' }),
});

export class RecruitmentRatingService {
	constructor(private db: DB) {}

	async setApplicationRating(applicationId: string, user: { id: string }, body: unknown) {
		const app = await this.db.findRecruitmentApplicationById(applicationId);
		if (!app) failRecruitment('APPLICATION_NOT_FOUND');

		const p = ratingBodySchema.parse(body);
		const result = await this.db.upsertRecruitmentApplicationRating({
			applicationId,
			userId: user.id,
			rating: p.rating,
		});
		broadcastRecruitmentApplicationsUpdated();
		return result;
	}
}
