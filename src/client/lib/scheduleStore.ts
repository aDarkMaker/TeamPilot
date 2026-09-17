import { createPersistedStore } from './createPersistedStore';
import { broadcastScheduleUpdated } from './events';

export type Role = 'user' | 'admin' | 'super_admin';

export type ScheduleParticipant = {
	userId: string;
	username: string;
	avatarUrl?: string | null;
	taskStatus?: 'pending' | 'accepted' | 'leave';
};

export type ScheduleDayItem = {
	id: string;
	title: string;
	description: string | null;
	location: string | null;
	year: number;
	month: number;
	day: number;
	startAt: string;
	endAt: string;
	durationMinutes: number;
	createdBy?: string;
	participants: ScheduleParticipant[];
};

type State = {
	byDay: Record<string, { items: ScheduleDayItem[]; updatedAt: number }>;
};

const store = createPersistedStore<State>({
	storageKey: 'hxk_schedule_store_v1',
	initial: { byDay: {} },
	parse: (raw) => {
		if (!raw || typeof raw !== 'object') return null;
		const byDay = (raw as { byDay?: unknown }).byDay;
		if (!byDay || typeof byDay !== 'object') return null;
		return { byDay: byDay as State['byDay'] };
	},
});

export function dayKey(input: { year: number; month: number; day: number }) {
	return `${input.year}-${String(input.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`;
}

export const scheduleStore = {
	getSnapshot: store.getSnapshot,
	subscribe: store.subscribe,
	hydrateFromStorage: store.hydrateFromStorage,

	setDayItems(key: string, items: ScheduleDayItem[]) {
		store.update((prev) => ({
			byDay: { ...prev.byDay, [key]: { items, updatedAt: Date.now() } },
		}));
	},
};

export { broadcastScheduleUpdated };
