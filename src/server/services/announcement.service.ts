import { z } from 'zod';

import type { DB } from '../db';

const createAnnouncementSchema = z.object({
	title: z.string().trim().min(1).max(80),
	contentMarkdown: z.string().trim().min(1).max(20000),
	isPinned: z.boolean().optional().default(false),
});

export class AnnouncementService {
	constructor(private db: DB) {}

	listAnnouncements(limit = 3) {
		return this.db.listHomeAnnouncements(limit);
	}

	async createAnnouncement(actor: { id: string }, body: unknown) {
		const p = createAnnouncementSchema.parse(body);
		return this.db.createHomeAnnouncement({
			title: p.title,
			contentMarkdown: p.contentMarkdown,
			isPinned: p.isPinned,
			createdBy: actor.id,
		});
	}

	async setAnnouncementPinned(id: string, isPinned: boolean) {
		await this.db.setHomeAnnouncementPinned({ id, isPinned });
	}

	async deleteAnnouncement(id: string) {
		await this.db.deleteHomeAnnouncement(id);
	}
}
