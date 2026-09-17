import { httpJson, httpJsonVoid } from '@/lib/httpJson';
import type { Role } from '@/lib/roles';
import type { ScheduleDayItem } from '@/lib/scheduleStore';

export type MentionUser = {
	id: string;
	username: string;
	nickname?: string | null;
	role?: Role;
	avatarUrl?: string | null;
};

export type CalendarMe = { id: string; username: string; role: Role };

export type ScheduleWriteBody = {
	title: string;
	scope: 'self' | 'all' | 'custom';
	participantIds: string[];
	description: string | null;
	year: number;
	month: number;
	day: number;
	startAt: string;
	endAt: string;
	durationMinutes: number;
	location: string | null;
};

export function fetchMe(): Promise<CalendarMe> {
	return httpJson<CalendarMe>('/api/users/me', { fallbackMessage: '加载当前用户失败' });
}

export function fetchWeek(startIso: string): Promise<ScheduleDayItem[]> {
	return httpJson<ScheduleDayItem[]>('/api/schedule/week', {
		query: { start: startIso },
		fallbackMessage: '加载日程失败',
	});
}

export function searchScheduleUsers(keyword: string): Promise<MentionUser[]> {
	return httpJson<MentionUser[]>('/api/schedule/users/search', {
		query: { q: keyword.trim() },
		fallbackMessage: '搜索成员失败',
	});
}

export function createSchedule(body: ScheduleWriteBody): Promise<ScheduleDayItem> {
	return httpJson<ScheduleDayItem>('/api/schedule', { method: 'POST', body, fallbackMessage: '创建失败' });
}

export function updateSchedule(id: string, body: ScheduleWriteBody): Promise<ScheduleDayItem> {
	return httpJson<ScheduleDayItem>(`/api/schedule/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		body,
		fallbackMessage: '更新失败',
	});
}

export function cancelSchedule(id: string): Promise<void> {
	return httpJsonVoid(`/api/schedule/${encodeURIComponent(id)}`, { method: 'DELETE', fallbackMessage: '取消失败' });
}
