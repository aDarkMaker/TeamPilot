export type TaskSourceType = 'schedule_at';

export type TaskStatus = 'pending' | 'accepted' | 'leave';

export interface TaskCard {
	id: string;
	targetUserId: string;
	actorUserId: string | null;

	sourceType: TaskSourceType;
	sourceId: string;

	title: string;
	content: string;
	payloadJson: string;

	status: TaskStatus;
	decidedAt: string | null;
	createdAt: string;
	updatedAt: string;
}
