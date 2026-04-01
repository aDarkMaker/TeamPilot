import { z } from 'zod';
import type { DB } from '../db';
import { canReviewApplication } from '../auth/rbac';
import { AppError } from '../types/api';
import type { Role } from '../types/auth';
import type { TaskStatus } from '../types/task';
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

	private getNowShanghaiParts() {
		const parts = new Intl.DateTimeFormat('zh-CN', {
			timeZone: 'Asia/Shanghai',
			hour12: false,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		}).formatToParts(new Date());
		const get = (type: Intl.DateTimeFormatPartTypes) =>
			Number(parts.find((p) => p.type === type)?.value ?? 0);
		return {
			year: get('year'),
			month: get('month'),
			day: get('day'),
			hour: get('hour'),
			minute: get('minute'),
		};
	}

	private parseHHmmToMinutes(hhmm: string): number | null {
		const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm).trim());
		if (!m) return null;
		const h = Number(m[1]);
		const mm = Number(m[2]);
		if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
		if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
		return h * 60 + mm;
	}

	private assertEndAfterStart(startAt: string, endAt: string) {
		const s = this.parseHHmmToMinutes(startAt);
		const e = this.parseHHmmToMinutes(endAt);
		if (s == null || e == null) {
			throw new AppError(400, 'INVALID_TIME', '开始或结束时间格式不正确');
		}
		if (e <= s) {
			throw new AppError(400, 'INVALID_TIME_RANGE', '结束时间必须晚于开始时间');
		}
	}

	private assertScheduleStartNotPast(input: {
		year: number;
		month: number;
		day: number;
		startAt: string;
	}) {
		const [h, m] = input.startAt.split(':').map((x) => Number(x));
		if (!Number.isFinite(h) || !Number.isFinite(m)) {
			throw new AppError(400, 'INVALID_TIME', '开始时间格式不正确');
		}
		const now = this.getNowShanghaiParts();
		const left = [input.year, input.month, input.day, h, m];
		const right = [now.year, now.month, now.day, now.hour, now.minute];
		for (let i = 0; i < left.length; i++) {
			if (left[i]! > right[i]!) return;
			if (left[i]! < right[i]!) {
				throw new AppError(400, 'SCHEDULE_START_IN_PAST', '还在缅怀过去吗，混蛋！');
			}
		}
	}

	private toTaskStartIso(input: { year: number; month: number; day: number; startAt: string }) {
		const mm = String(input.month).padStart(2, '0');
		const dd = String(input.day).padStart(2, '0');
		return `${input.year}-${mm}-${dd}T${input.startAt}:00`;
	}

	private async syncScheduleTaskCards(input: {
		scheduleId: string;
		actorId: string;
		isAll: boolean;
		title: string;
		description: string | null;
		year: number;
		month: number;
		day: number;
		startAt: string;
		endAt: string;
		participantIds: string[];
	}) {
		let targets = input.participantIds;
		if (input.isAll) {
			const all = await this.db.listUsers();
			targets = all.filter((u) => u.status === 'active').map((u) => u.id);
		}
		const uniqueTargets = Array.from(new Set([...targets, input.actorId])).filter(Boolean);
		if (uniqueTargets.length === 0) return;

		const payload = JSON.stringify({
			startAtIso: this.toTaskStartIso(input),
			year: input.year,
			month: input.month,
			day: input.day,
			startAt: input.startAt,
			endAt: input.endAt,
		});

		await Promise.all(
			uniqueTargets.map((targetUserId) =>
				this.db.createOrReplaceTaskCard({
					targetUserId,
					actorUserId: input.actorId,
					sourceType: 'schedule_at',
					sourceId: input.scheduleId,
					title: `日程提醒：${input.title}`,
					content: input.description ?? null,
					payloadJson: payload,
				}),
			),
		);
		await this.db.pruneTaskCardsBySourceTargets({
			sourceType: 'schedule_at',
			sourceId: input.scheduleId,
			keepTargetUserIds: uniqueTargets,
		});
	}

	private async loadParticipantsWithTaskStatus(schedule: { id: string; isAll: boolean }) {
		const participants = schedule.isAll
			? (await this.db.listUsers())
					.filter((u) => u.status === 'active')
					.map((u) => ({
						scheduleId: schedule.id,
						userId: u.id,
						username: u.username,
						avatarPath: u.avatarPath ?? null,
					}))
			: await this.db.listScheduleParticipants(schedule.id);
		const taskCards = await this.db.listTaskCardsBySource({ sourceType: 'schedule_at', sourceId: schedule.id });
		const statusByUser = new Map<string, TaskStatus>(taskCards.map((t) => [String(t.targetUserId), t.status]));
		return (participants as any[]).map((p) => ({
			scheduleId: p.scheduleId,
			userId: p.userId,
			username: p.username,
			avatarUrl: this.toPublicUrl(p.avatarPath),
			taskStatus: statusByUser.get(String(p.userId)) ?? 'pending',
		}));
	}

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
		this.assertEndAfterStart(parsed.startAt, parsed.endAt);
		const startM = this.parseHHmmToMinutes(parsed.startAt)!;
		const endM = this.parseHHmmToMinutes(parsed.endAt)!;
		const durationMinutes = endM - startM;
		if (durationMinutes < 5 || durationMinutes > 24 * 60) {
			throw new AppError(400, 'INVALID_DURATION', '你这是正经日程吗');
		}
		this.assertScheduleStartNotPast({
			year: parsed.year,
			month: parsed.month,
			day: parsed.day,
			startAt: parsed.startAt,
		});

		let participantIds: string[] = [];
		let isAll = false;
		if (!canReviewApplication(actor.role)) {
			participantIds = [actor.id];
		} else if (parsed.scope === 'all') {
			isAll = true;
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
			isAll,
            description: parsed.description ?? null,
            year: parsed.year,
            month: parsed.month,
            day: parsed.day,
            startAt: parsed.startAt,
            endAt: parsed.endAt,
            durationMinutes,
            location: parsed.location ?? null,
			createdBy: actor.id,
        });
		await this.syncScheduleTaskCards({
			scheduleId: schedule.id,
			actorId: actor.id,
			isAll: schedule.isAll,
			title: parsed.title,
			description: parsed.description ?? null,
			year: parsed.year,
			month: parsed.month,
			day: parsed.day,
			startAt: parsed.startAt,
			endAt: parsed.endAt,
			participantIds,
		});
        const participants = await this.loadParticipantsWithTaskStatus(schedule);
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
			schedules.map(async (s) => {
				if (s.isAll) {
					await this.syncScheduleTaskCards({
						scheduleId: s.id,
						actorId: s.createdBy,
						isAll: true,
						title: s.title,
						description: s.description ?? null,
						year: s.year,
						month: s.month,
						day: s.day,
						startAt: s.startAt,
						endAt: s.endAt,
						participantIds: [],
					});
				}
				return {
					...s,
					participants: await this.loadParticipantsWithTaskStatus(s),
				};
			})
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
			schedules.map(async (s) => {
				if (s.isAll) {
					await this.syncScheduleTaskCards({
						scheduleId: s.id,
						actorId: s.createdBy,
						isAll: true,
						title: s.title,
						description: s.description ?? null,
						year: s.year,
						month: s.month,
						day: s.day,
						startAt: s.startAt,
						endAt: s.endAt,
						participantIds: [],
					});
				}
				return {
					...s,
					participants: await this.loadParticipantsWithTaskStatus(s),
				};
			})
		);
	}

	async update(actor: { id: string; role: Role }, scheduleId: string, body: unknown) {
		// creator-only edit (as requested). Role not used except for type symmetry.
		const parsed = createSchema
			.omit({ scope: true })
			.extend({ participantIds: z.array(z.string()).default([]) })
			.parse(body);

		this.assertEndAfterStart(parsed.startAt, parsed.endAt);
		const startM = this.parseHHmmToMinutes(parsed.startAt)!;
		const endM = this.parseHHmmToMinutes(parsed.endAt)!;
		const durationMinutes = endM - startM;
		if (durationMinutes < 5 || durationMinutes > 24 * 60) {
			throw new AppError(400, 'INVALID_DURATION', '你这是正经日程吗');
		}

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
				durationMinutes,
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
		const effectiveParticipantIds = participantIds.length
			? participantIds
			: (await this.db.listScheduleParticipants(updated.id)).map((p: any) => String(p.userId));
		await this.syncScheduleTaskCards({
			scheduleId: updated.id,
			actorId: actor.id,
			isAll: updated.isAll,
			title: parsed.title,
			description: parsed.description ?? null,
			year: parsed.year,
			month: parsed.month,
			day: parsed.day,
			startAt: parsed.startAt,
			endAt: parsed.endAt,
			participantIds: effectiveParticipantIds,
		});

		const participants = await this.loadParticipantsWithTaskStatus(updated);
		return {
			...updated,
			participants,
		};
	}

	async cancel(actor: { id: string; role: Role }, scheduleId: string) {
		try {
			await this.db.deleteSchedule(scheduleId, { id: actor.id });
			await this.db.deleteTaskCardsBySource({ sourceType: 'schedule_at', sourceId: scheduleId });
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