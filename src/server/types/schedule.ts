export type ScheduleGranularity = 'single_day' | 'data_range';

export interface Schedule {
	id: string;
	title: string;
	description: string;
	location: string;
	isAll: boolean;

	year: number;
	month: number;
	day: number;
	startAt: string;
	endAt: string;
	durationMinutes: number;

	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export interface ScheduleParticipant {
	scheduleId: string;
	userId: string;
	username: string;
	avatarPath?: string | null;
}
