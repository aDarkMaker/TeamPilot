import { z } from 'zod';
import type { DB } from '../db';
import { AppError } from '../types/api';
import { hashPassword } from '../auth/password';

const submitSchema = z.object({
	username: z.string().min(2).max(4),
	password: z.string().min(8).max(128),
	reason: z.string().min(2).max(500),
});

export class ApplicationService {
	constructor(private db: DB) {}

	async submit(input: unknown) {
		const parsed = submitSchema.parse(input);

		const existingUser = await this.db.findUserByUsername(parsed.username);
		if (existingUser) {
			throw new AppError(409, 'USERNAME_EXISTS', 'USERNAME_ALREADY_EXISTS');
		}

		const passwordHash = await hashPassword(parsed.password);

		return this.db.createAccountApplication({
			username: parsed.username,
			passwordHash,
			reason: parsed.reason,
		});
	}

	async listPending() {
		return this.db.findPendingApplications();
	}

	async approve(applicationId: string, reviewerId: string) {
		const app = await this.db.findApplicationById(applicationId);
		if (!app) throw new AppError(404, 'APPLICATION_NOT_FOUND', 'APPLICATION_NOT_FOUND');
		if (app.status !== 'pending') {
			throw new AppError(409, 'APPLICATION_ALREADY_REVIEWED', 'APPLICATION_ALREADY_REVIEWED');
		}

		await this.db.createUser({
			username: app.username,
			passwordHash: app.passwordHash,
			role: 'user',
			status: 'active',
		});

		await this.db.setApplicationReview({
			id: app.id,
			status: 'approved',
			reviewedBy: reviewerId,
		});
	}

	async reject(applicationId: string, reviewerId: string) {
		const app = await this.db.findApplicationById(applicationId);
		if (!app) throw new AppError(404, 'APPLICATION_NOT_FOUND', 'APPLICATION_NOT_FOUND');
		if (app.status !== 'pending') {
			throw new AppError(409, 'APPLICATION_ALREADY_REVIEWED', 'APPLICATION_ALREADY_REVIEWED');
		}

		await this.db.setApplicationReview({
			id: app.id,
			status: 'rejected',
			reviewedBy: reviewerId,
		});
	}
}
