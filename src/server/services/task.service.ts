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

    async listMyTasks(actor: { id: string }, query: unknown) {
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
        return await this.db.countPendingTaskCardsByUser(actor.id);
    }

    async decideMyTask(actor: {id: string }, taskId: string, body: unknown) {
        const parsed = decideBodySchema.parse(body);
        try {
            return await this.db.decideTaskCard({
                taskId,
                targetUserId: actor.id,
                status: parsed.status,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'DECIDE_FAILED';
            if (msg === 'TASK_NOT_FOUND') throw new AppError(404, 'TASK_NOT_FOUND', 'TASK_NOT_FOUND');
            if (msg === 'FORBIDDEN') throw new AppError(403, 'FORBIDDEN', 'FORBIDDEN');
            throw e;
        }
    }
}