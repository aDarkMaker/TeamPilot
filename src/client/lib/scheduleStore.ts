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

const STORAGE_KEY = 'hxk_schedule_store_v1';

function safeParse(raw: string | null): State | null {
	if (!raw) return null;
	try {
		const v = JSON.parse(raw) as any;
		if (!v || typeof v !== 'object') return null;
		if (!v.byDay || typeof v.byDay !== 'object') return null;
		return { byDay: v.byDay };
	} catch {
		return null;
	}
}

function readPersisted(): State {
	if (typeof window === 'undefined') return { byDay: {} };
	return safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? { byDay: {} };
}

function persist(next: State) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// ignore
	}
}

let state: State = readPersisted();
const listeners = new Set<() => void>();

function emit() {
	for (const l of listeners) l();
}

function setState(next: State) {
	state = next;
	persist(next);
	emit();
}

export function dayKey(input: { year: number; month: number; day: number }) {
	return `${input.year}-${String(input.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`;
}

export const scheduleStore = {
	getSnapshot(): State {
		return state;
	},
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
	hydrateFromStorage() {
		setState(readPersisted());
	},
	setDayItems(key: string, items: ScheduleDayItem[]) {
		setState({
			byDay: {
				...state.byDay,
				[key]: { items, updatedAt: Date.now() },
			},
		});
	},
};

declare global {
	interface WindowEventMap {
		'hxk:schedule-updated': CustomEvent<{ dayKey?: string }>;
	}
}

export function broadcastScheduleUpdated(dayKey?: string) {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent('hxk:schedule-updated', { detail: { dayKey } }));
}

