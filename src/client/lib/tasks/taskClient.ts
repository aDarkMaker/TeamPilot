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

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; code: string; message: string };

async function parseJson<T>(res: Response): Promise<ApiSuccess<T> | ApiFailure> {
	return (await res.json().catch(() => ({}))) as ApiSuccess<T> | ApiFailure;
}

function errText(json: ApiSuccess<unknown> | ApiFailure, fallback: string) {
	if ('ok' in json && !json.ok && typeof json.message === 'string') return json.message;
	return fallback;
}

export async function fetchMyTasks(input?: { status?: TaskStatus; limit?: number; offset?: number }): Promise<TaskCard[]> {
	const q = new URLSearchParams();
	if (input?.status) q.set('status', input.status);
	if (input?.limit != null) q.set('limit', String(input.limit));
	if (input?.offset != null) q.set('offset', String(input.offset));

	const res = await fetch(`/api/tasks${q.toString() ? `?${q}` : ''}`, { credentials: 'include' });
	const json = await parseJson<TaskCard[]>(res);
	if (!res.ok || !json.ok) throw new Error(errText(json, 'LOAD_TASKS_FAILED'));
	return json.data ?? [];
}

export async function decideTask(taskId: string, status: 'accepted' | 'leave'): Promise<TaskCard> {
	const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/decide`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ status }),
	});
	const json = await parseJson<TaskCard>(res);
	if (!res.ok || !json.ok || !json.data) throw new Error(errText(json, 'DECIDE_TASK_FAILED'));
	return json.data;
}

export async function fetchMyPendingTaskCount(): Promise<number> {
	const res = await fetch('/api/tasks/pending-count', { credentials: 'include' });
	const json = await parseJson<{ pending: number }>(res);
	if (!res.ok || !json.ok || !json.data) throw new Error(errText(json, 'LOAD_TASK_PENDING_COUNT_FAILED'));
	return Number(json.data.pending ?? 0);
}
