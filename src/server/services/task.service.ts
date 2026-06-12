import { z } from 'zod';
import type { DB } from '../db';
import { AppError } from '../types/api';

const listQuerySchema = z.object({
	status: z.enum(['pending', 'accepted', 'leave']).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	offset: z.coerce.number().int().min(0).optional(),
});

const decideBodySchema = z.object({
	status: z.enum(['accepted', 'leave']),
});

export class TaskService {
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
		return `${get('year')}-${get('month')}-${get('day')}`;
	}

	private toTaskStartIso(input: { year: number; month: number; day: number; startAt: string }) {
		const mm = String(input.month).padStart(2, '0');
		const dd = String(input.day).padStart(2, '0');
		return `${input.year}-${mm}-${dd}T${input.startAt}:00`;
	}

	private async ensureAllScheduleTasksForUser(userId: string) {
		const allSchedules = await this.db.listAllSchedulesFromDate({ startDate: this.getShanghaiYmd() });
		await Promise.all(
			allSchedules.map((s) =>
				this.db.createOrReplaceTaskCard({
					targetUserId: userId,
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
				})
			)
		);
	}

	async listMyTasks(actor: { id: string }, query: unknown) {
		await this.ensureAllScheduleTasksForUser(actor.id);
		const q = listQuerySchema.parse(query);
		const rows = await this.db.listTaskCardsByUser({
			targetUserId: actor.id,
			status: q.status,
			limit: q.limit ?? 20,
			offset: q.offset ?? 0,
		});
		const scheduleTasks = rows.filter((t) => t.sourceType === 'schedule_at');
		for (const t of scheduleTasks) {
			const exists = await this.db.findScheduleById(t.sourceId);
			if (!exists) {
				await this.db.deleteTaskCardsBySource({ sourceType: 'schedule_at', sourceId: t.sourceId });
			}
		}
		// 再查一次，确保返回给前端的是干净的
		return await this.db.listTaskCardsByUser({
			targetUserId: actor.id,
			status: q.status,
			limit: q.limit ?? 20,
			offset: q.offset ?? 0,
		});
	}

	async countMyPending(actor: { id: string }) {
		await this.ensureAllScheduleTasksForUser(actor.id);
		return await this.db.countPendingTaskCardsByUser(actor.id);
	}

	async decideMyTask(actor: { id: string }, taskId: string, body: unknown) {
		const parsed = decideBodySchema.parse(body);
		try {
			return await this.db.decideTaskCard({
				taskId,
				targetUserId: actor.id,
				status: parsed.status,
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'DECIDE_FAILED';
			if (msg === 'TASK_NOT_FOUND') throw new AppError(404, 'TASK_NOT_FOUND', '任务不见啦');
			if (msg === 'FORBIDDEN') throw new AppError(403, 'FORBIDDEN', '这里没有你的权限哦');
			throw e;
		}
	}
}
