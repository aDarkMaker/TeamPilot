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

	private getShanghaiYmd() {
		const parts = new Intl.DateTimeFormat('zh-CN', {
			timeZone: 'Asia/Shanghai',
			hour12: false,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(new Date());
		const get = (type: Intl.DateTimeFormatPartTypes) => String(parts.find((p) => p.type === type)?.value ?? '');
		const y = get('year');
		const m = get('month');
		const d = get('day');
		return `${y}-${m}-${d}`;
	}

	private toTaskStartIso(input: { year: number; month: number; day: number; startAt: string }) {
		const mm = String(input.month).padStart(2, '0');
		const dd = String(input.day).padStart(2, '0');
		return `${input.year}-${mm}-${dd}T${input.startAt}:00`;
	}

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

		const user = await this.db.createUser({
			username: app.username,
			passwordHash: app.passwordHash,
			role: 'user',
			status: 'active',
		});

		// 新加入账号需要继承历史“全体日程”的任务卡（动态全体语义）。
		const startDate = this.getShanghaiYmd();
		const allSchedules = await this.db.listAllSchedulesFromDate({ startDate });
		await Promise.all(
			allSchedules.map((s) =>
				this.db.createOrReplaceTaskCard({
					targetUserId: user.id,
					actorUserId: s.createdBy ?? null,
					sourceType: 'schedule_at',
					sourceId: s.id,
					title: `日程提醒：${s.title}`,
					content: s.description ?? null,
					payloadJson: JSON.stringify({
						startAtIso: this.toTaskStartIso(s),
						year: s.year,
						month: s.month,
						day: s.day,
						startAt: s.startAt,
						endAt: s.endAt,
					}),
				}),
			),
		);

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
