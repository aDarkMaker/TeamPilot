export type PendingApplication = {
	id: string;
	username: string;
	reason: string;
	status: 'pending' | 'approved' | 'rejected';
	createdAt: string;
};

type State = {
	items: PendingApplication[];
	updatedAt: number;
};

const STORAGE_KEY = 'hxk_pending_applications_v1';

function safeParseState(raw: string | null): State | null {
	if (!raw) return null;
	try {
		const v = JSON.parse(raw) as unknown;
		if (!v || typeof v !== 'object') return null;
		const o = v as any;
		if (!Array.isArray(o.items) || typeof o.updatedAt !== 'number') return null;
		return { items: o.items as PendingApplication[], updatedAt: o.updatedAt };
	} catch {
		return null;
	}
}

function readPersisted(): State {
	if (typeof window === 'undefined') return { items: [], updatedAt: 0 };
	return safeParseState(window.localStorage.getItem(STORAGE_KEY)) ?? { items: [], updatedAt: 0 };
}

function persist(next: State) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// ignore quota or privacy mode
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

export const pendingApplicationsStore = {
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

	setItems(items: PendingApplication[]) {
		setState({ items, updatedAt: Date.now() });
	},

	removeById(id: string) {
		const next = state.items.filter((x) => x.id !== id);
		if (next.length === state.items.length) return;
		setState({ items: next, updatedAt: Date.now() });
	},
};

declare global {
	interface WindowEventMap {
		'hxk:applications-updated': CustomEvent<{ updatedAt: number }>;
	}
}

export function broadcastApplicationsUpdated() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent('hxk:applications-updated', { detail: { updatedAt: Date.now() } }));
}
