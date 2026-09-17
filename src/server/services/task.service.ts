import { z } from 'zod';
import type { DB } from '../db';
import { rethrowMapped } from '../lib/errorMap';
import { ensureScheduleTasksForUser } from './scheduleTaskSync.service';

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

	async listMyTasks(actor: { id: string }, query: unknown) {
		await ensureScheduleTasksForUser(this.db, actor.id);
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
		// Re-query so the client only ever sees a clean list
		return await this.db.listTaskCardsByUser({
			targetUserId: actor.id,
			status: q.status,
			limit: q.limit ?? 20,
			offset: q.offset ?? 0,
		});
	}

	async countMyPending(actor: { id: string }) {
		await ensureScheduleTasksForUser(this.db, actor.id);
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
			rethrowMapped(e, {
				TASK_NOT_FOUND: { status: 404, code: 'TASK_NOT_FOUND', message: '任务不见啦' },
				FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: '这里没有你的权限哦' },
			});
		}
	}
}
