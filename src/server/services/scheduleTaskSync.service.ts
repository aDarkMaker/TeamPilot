import type { DB } from '../db';
import { getShanghaiYmd, toTaskStartIso } from '../lib/shanghaiTime';

export interface ScheduleTaskSyncInput {
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
}

interface ScheduleLike {
	id: string;
	createdBy: string | null;
	title: string;
	description: string | null;
	year: number;
	month: number;
	day: number;
	startAt: string;
	endAt: string;
}

function buildPayload(input: { year: number; month: number; day: number; startAt: string; endAt: string }): string {
	return JSON.stringify({
		startAtIso: toTaskStartIso(input),
		year: input.year,
		month: input.month,
		day: input.day,
		startAt: input.startAt,
		endAt: input.endAt,
	});
}

/** Create one schedule reminder task card for a user */
export async function upsertScheduleTaskCardForUser(db: DB, targetUserId: string, schedule: ScheduleLike): Promise<void> {
	await db.createOrReplaceTaskCard({
		targetUserId,
		actorUserId: schedule.createdBy ?? null,
		sourceType: 'schedule_at',
		sourceId: schedule.id,
		title: `日程提醒：${schedule.title}`,
		content: schedule.description ?? null,
		payloadJson: buildPayload(schedule),
	});
}

/** Fan out every schedule from today on into task cards for one user (login, approval, task list refresh) */
export async function ensureScheduleTasksForUser(db: DB, userId: string): Promise<void> {
	const allSchedules = await db.listAllSchedulesFromDate({ startDate: getShanghaiYmd() });
	await Promise.all(allSchedules.map((s) => upsertScheduleTaskCardForUser(db, userId, s)));
}

/** Rebuild task cards after a schedule is created/updated, dropping targets that were removed */
export async function syncScheduleTaskCards(db: DB, input: ScheduleTaskSyncInput): Promise<void> {
	let targets = input.participantIds;
	if (input.isAll) {
		const all = await db.listUsers();
		targets = all.filter((u) => u.status === 'active').map((u) => u.id);
	}
	const uniqueTargets = Array.from(new Set([...targets, input.actorId])).filter(Boolean);
	if (uniqueTargets.length === 0) return;

	const payloadJson = buildPayload(input);

	await Promise.all(
		uniqueTargets.map((targetUserId) =>
			db.createOrReplaceTaskCard({
				targetUserId,
				actorUserId: input.actorId,
				sourceType: 'schedule_at',
				sourceId: input.scheduleId,
				title: `日程提醒：${input.title}`,
				content: input.description ?? null,
				payloadJson,
			})
		)
	);
	await db.pruneTaskCardsBySourceTargets({
		sourceType: 'schedule_at',
		sourceId: input.scheduleId,
		keepTargetUserIds: uniqueTargets,
	});
}
