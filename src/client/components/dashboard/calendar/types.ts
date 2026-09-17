import type { CalendarMe, MentionUser } from '@/lib/calendar/calendarClient';
import type { Ymd } from '@/lib/calendar/dateGrid';

export type { CalendarMe, MentionUser };

export type DraftRange = {
	dayKey: string;
	day: Ymd;
	startMin: number;
	endMin: number;
	active: boolean;
};

export type ScheduleScope = 'self' | 'all' | 'custom';
