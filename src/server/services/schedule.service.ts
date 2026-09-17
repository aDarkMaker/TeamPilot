import { z } from 'zod';
import type { DB } from '../db';
import { canReviewApplication, roleRank } from '../auth/rbac';
import { AppError } from '../types/api';
import type { Role } from '../types/auth';
import type { TaskStatus } from '../types/task';
import { rethrowMapped } from '../lib/errorMap';
import { toPublicWebpUrl } from '../lib/mediaUrl';
import { matchesUserByQuery, normalizeKey } from '../lib/pinyinSearch';
import { assertEndAfterStart, assertScheduleStartNotPast, parseHHmmToMinutes } from '../lib/shanghaiTime';
import { syncScheduleTaskCards } from './scheduleTaskSync.service';

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
	durationMinutes: z
		.number()
		.int()
		.min(5)
		.max(24 * 60),
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

/** Schedule mutations signal these codes from the db layer; both update and cancel use them */
const SCHEDULE_ERRORS = {
	SCHEDULE_NOT_FOUND: { status: 404, code: 'SCHEDULE_NOT_FOUND', message: '日程不见啦' },
	FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: '这里没有你的权限哦' },
};

export class ScheduleService {
	constructor(private db: DB) {}

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
			avatarUrl: toPublicWebpUrl(p.avatarPath),
			taskStatus: statusByUser.get(String(p.userId)) ?? 'pending',
		}));
	}

	async create(actor: { id: string; role: Role }, body: unknown) {
		const parsed = createSchema.parse(body);
		assertEndAfterStart(parsed.startAt, parsed.endAt);
		const startM = parseHHmmToMinutes(parsed.startAt)!;
		const endM = parseHHmmToMinutes(parsed.endAt)!;
		const durationMinutes = endM - startM;
		if (durationMinutes < 5 || durationMinutes > 24 * 60) {
			throw new AppError(400, 'INVALID_DURATION', '你这是正经日程吗');
		}
		assertScheduleStartNotPast({
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
		await syncScheduleTaskCards(this.db, {
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
					await syncScheduleTaskCards(this.db, {
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
		if (Number.isNaN(startObj.getTime())) throw new AppError(400, 'INVALID_DATE', '这个日期不太对劲');
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
					await syncScheduleTaskCards(this.db, {
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

		assertEndAfterStart(parsed.startAt, parsed.endAt);
		const startM = parseHHmmToMinutes(parsed.startAt)!;
		const endM = parseHHmmToMinutes(parsed.endAt)!;
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
			rethrowMapped(e, SCHEDULE_ERRORS);
		}

		// participants: keep existing behavior: only allow editing participants when actor is creator
		const participantIds = Array.from(new Set(parsed.participantIds)).filter(Boolean);
		if (participantIds.length) {
			await this.db.replaceScheduleParticipants({ scheduleId, participantIds });
		}
		const effectiveParticipantIds = participantIds.length
			? participantIds
			: (await this.db.listScheduleParticipants(updated.id)).map((p: any) => String(p.userId));
		await syncScheduleTaskCards(this.db, {
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
			rethrowMapped(e, SCHEDULE_ERRORS);
		}
	}

	async searchUsers(query: unknown) {
		const qRaw = z.object({ q: z.string().trim().max(20).optional().default('') }).parse(query).q;
		const q = normalizeKey(qRaw);

		const all = await this.db.listUsers();
		const active = all.filter((u) => u.status === 'active');

		// Feishu-like: when only '@' (q empty), still show a list.
		const pool = q ? active.filter((u) => matchesUserByQuery(q, { username: u.username, nickname: u.nickname ?? null })) : active;

		// Prefer higher roles first when showing default list.
		const sorted = pool.sort((a, b) => roleRank(b.role) - roleRank(a.role) || a.username.localeCompare(b.username));

		return sorted.slice(0, 20).map((u) => ({
			id: u.id,
			username: u.username,
			nickname: u.nickname ?? null,
			role: u.role,
			avatarUrl: toPublicWebpUrl(u.avatarPath),
		}));
	}
}
