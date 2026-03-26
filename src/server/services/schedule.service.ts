import { z } from 'zod';
import type { DB } from '../db';
import { canReviewApplication } from '../auth/rbac';
import { AppError } from '../types/api';
import type { Role } from '../types/auth';
import { pinyin } from 'pinyin-pro';

const createSchema = z.object({
    title: z.string().min(1).max(100),
	scope: z.enum(['self', 'all', 'custom']).default('self'),
	participantIds: z.array(z.string()).default([]),
    description: z.string().max(2000).nullable().optional(),
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    startAt: z.string().regex(/^\d{2}:\d{2}$/),
    endAt: z.string().regex(/^\d{2}:\d{2}$/),
    durationMinutes: z.number().int().min(5).max(24 * 60),
    location: z.string().max(200).nullable().optional(),
});

const daySchema = z.object({
	year: z.coerce.number().int().min(2000).max(2100),
	month: z.coerce.number().int().min(1).max(12),
	day: z.coerce.number().int().min(1).max(31),
});

const weekSchema = z.object({
	start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export class ScheduleService {
    constructor(private db: DB) {}

	private toPublicUrl(storedPath: string | null | undefined) {
		return storedPath ? `/uploads/${String(storedPath).replace(/^\/+/, '')}` : null;
	}

	private normalizeKey(s: string) {
		return s.trim().toLowerCase().replace(/\s+/g, '');
	}

	private pinyinTokens(raw: string) {
		const normalized = this.normalizeKey(raw);
		if (!normalized) return { full: '', initials: '' };
		const full = this.normalizeKey(
			pinyin(normalized, {
				toneType: 'none',
				type: 'string',
				separator: '',
				nonZh: 'removed',
			})
		);
		const initials = this.normalizeKey(
			pinyin(normalized, {
				toneType: 'none',
				pattern: 'first',
				type: 'string',
				separator: '',
				nonZh: 'removed',
			})
		);
		return { full, initials };
	}

	async create(actor: { id: string; role: Role }, body: unknown) {
        const parsed = createSchema.parse(body);

		let participantIds: string[] = [];
		if (!canReviewApplication(actor.role)) {
			participantIds = [actor.id];
		} else if (parsed.scope === 'all') {
			const all = await this.db.listUsers();
			participantIds = all.filter((u) => u.status === 'active').map((u) => u.id);
		} else if (parsed.scope === 'custom') {
			participantIds = Array.from(new Set(parsed.participantIds)).filter(Boolean);
			if (participantIds.length === 0) {
				throw new AppError(400, 'INVALID_PARTICIPANTS', '请选择成员');
			}
		} else {
			participantIds = [actor.id];
		}

        const schedule = await this.db.createSchedule({
            title: parsed.title,
			participantIds,
            description: parsed.description ?? null,
            year: parsed.year,
            month: parsed.month,
            day: parsed.day,
            startAt: parsed.startAt,
            endAt: parsed.endAt,
            durationMinutes: parsed.durationMinutes,
            location: parsed.location ?? null,
			createdBy: actor.id,
        });
        const participants = (await this.db.listScheduleParticipants(schedule.id)).map((p: any) => ({
			scheduleId: p.scheduleId,
			userId: p.userId,
			username: p.username,
			avatarUrl: this.toPublicUrl(p.avatarPath),
		}));
        return { ...schedule, participants };
    }

	async listByDay(actor: { id: string; role: Role }, query: unknown) {
		const { year, month, day } = daySchema.parse(query);
		const schedules = await this.db.listSchedulesByDayForUser({
			year,
			month,
			day,
			userId: actor.id,
		});
		return Promise.all(
			schedules.map(async (s) => ({
				...s,
				participants: (await this.db.listScheduleParticipants(s.id)).map((p: any) => ({
					scheduleId: p.scheduleId,
					userId: p.userId,
					username: p.username,
					avatarUrl: this.toPublicUrl(p.avatarPath),
				})),
			}))
		);
    }

	async listByWeek(actor: { id: string; role: Role }, query: unknown) {
		const { start } = weekSchema.parse(query);
		const startDate = start;
		const startObj = new Date(`${startDate}T00:00:00`);
		if (Number.isNaN(startObj.getTime())) throw new AppError(400, 'INVALID_DATE', 'INVALID_DATE');
		const endObj = new Date(startObj);
		endObj.setDate(endObj.getDate() + 6);
		const endDate = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, '0')}-${String(endObj.getDate()).padStart(2, '0')}`;

		const schedules = await this.db.listSchedulesByDateRangeForUser({
			startDate,
			endDate,
			userId: actor.id,
		});

		return Promise.all(
			schedules.map(async (s) => ({
				...s,
				participants: (await this.db.listScheduleParticipants(s.id)).map((p: any) => ({
					scheduleId: p.scheduleId,
					userId: p.userId,
					username: p.username,
					avatarUrl: this.toPublicUrl(p.avatarPath),
				})),
			}))
		);
	}

	async update(actor: { id: string; role: Role }, scheduleId: string, body: unknown) {
		// creator-only edit (as requested). Role not used except for type symmetry.
		const parsed = createSchema
			.omit({ scope: true })
			.extend({ participantIds: z.array(z.string()).default([]) })
			.parse(body);

		let updated;
		try {
			updated = await this.db.updateSchedule(
			{
				id: scheduleId,
				title: parsed.title,
				description: parsed.description ?? null,
				location: parsed.location ?? null,
				year: parsed.year,
				month: parsed.month,
				day: parsed.day,
				startAt: parsed.startAt,
				endAt: parsed.endAt,
				durationMinutes: parsed.durationMinutes,
			},
			{ id: actor.id }
			);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'UPDATE_FAILED';
			if (msg === 'SCHEDULE_NOT_FOUND') throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'SCHEDULE_NOT_FOUND');
			if (msg === 'FORBIDDEN') throw new AppError(403, 'FORBIDDEN', 'FORBIDDEN');
			throw e;
		}

		// participants: keep existing behavior: only allow editing participants when actor is creator
		const participantIds = Array.from(new Set(parsed.participantIds)).filter(Boolean);
		if (participantIds.length) {
			await this.db.replaceScheduleParticipants({ scheduleId, participantIds });
		}

		const participants = await this.db.listScheduleParticipants(updated.id);
		return {
			...updated,
			participants: (participants as any[]).map((p) => ({
				scheduleId: p.scheduleId,
				userId: p.userId,
				username: p.username,
				avatarUrl: this.toPublicUrl(p.avatarPath),
			})),
		};
	}

	async cancel(actor: { id: string; role: Role }, scheduleId: string) {
		try {
			await this.db.deleteSchedule(scheduleId, { id: actor.id });
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'DELETE_FAILED';
			if (msg === 'SCHEDULE_NOT_FOUND') throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'SCHEDULE_NOT_FOUND');
			if (msg === 'FORBIDDEN') throw new AppError(403, 'FORBIDDEN', 'FORBIDDEN');
			throw e;
		}
	}

    async searchUsers(query: unknown) {
		const qRaw = z.object({ q: z.string().trim().max(20).optional().default('') }).parse(query).q;
		const q = this.normalizeKey(qRaw);

		const all = await this.db.listUsers();
		const active = all.filter((u) => u.status === 'active');

		// Feishu-like: when only '@' (q empty), still show a list.
		const pool = q
			? active.filter((u) => {
					const display = (u.nickname?.trim() || u.username || '').trim();
					const k1 = this.normalizeKey(u.username ?? '');
					const k2 = this.normalizeKey(u.nickname ?? '');
					const k3 = this.normalizeKey(display);

					const { full, initials } = this.pinyinTokens(display);
					const { full: full2, initials: initials2 } = this.pinyinTokens(u.username ?? '');
					const { full: full3, initials: initials3 } = this.pinyinTokens(u.nickname ?? '');

					return (
						k1.includes(q) ||
						k2.includes(q) ||
						k3.includes(q) ||
						(full && full.includes(q)) ||
						(initials && initials.includes(q)) ||
						(full2 && full2.includes(q)) ||
						(initials2 && initials2.includes(q)) ||
						(full3 && full3.includes(q)) ||
						(initials3 && initials3.includes(q))
					);
				})
			: active;

		// Prefer higher roles first when showing default list.
		const roleRank: Record<Role, number> = { super_admin: 3, admin: 2, user: 1 };
		const sorted = pool.sort((a, b) => (roleRank[b.role] ?? 0) - (roleRank[a.role] ?? 0) || a.username.localeCompare(b.username));

		return sorted.slice(0, 20).map((u) => ({
			id: u.id,
			username: u.username,
			nickname: u.nickname ?? null,
			role: u.role,
			avatarUrl: this.toPublicUrl(u.avatarPath),
		}));
    }
}