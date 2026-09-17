import { httpJson } from '@/lib/httpJson';

export type TaskSourceType = 'schedule_at';
export type TaskStatus = 'pending' | 'accepted' | 'leave';

export type TaskCard = {
	id: string;
	targetUserId: string;
	actorUserId: string | null;

	sourceType: TaskSourceType;
	sourceId: string;

	title: string;
	content: string | null;
	payloadJson: string | null;

	status: TaskStatus;
	decidedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export async function fetchMyTasks(input?: { status?: TaskStatus; limit?: number; offset?: number }): Promise<TaskCard[]> {
	const data = await httpJson<TaskCard[]>('/api/tasks', {
		query: { status: input?.status, limit: input?.limit, offset: input?.offset },
		fallbackMessage: '任务列表加载失败了',
	});
	return data ?? [];
}

export function decideTask(taskId: string, status: 'accepted' | 'leave'): Promise<TaskCard> {
	return httpJson<TaskCard>(`/api/tasks/${encodeURIComponent(taskId)}/decide`, {
		method: 'POST',
		body: { status },
		fallbackMessage: '更新任务状态失败了',
	});
}

export async function fetchMyPendingTaskCount(): Promise<number> {
	const data = await httpJson<{ pending: number }>('/api/tasks/pending-count', {
		fallbackMessage: '待办数量加载失败了',
	});
	return Number(data.pending ?? 0);
}
