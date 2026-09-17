import { createPersistedStore } from './createPersistedStore';
import { broadcastApplicationsUpdated } from './events';

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

const store = createPersistedStore<State>({
	storageKey: 'hxk_pending_applications_v1',
	initial: { items: [], updatedAt: 0 },
	parse: (raw) => {
		if (!raw || typeof raw !== 'object') return null;
		const o = raw as { items?: unknown; updatedAt?: unknown };
		if (!Array.isArray(o.items) || typeof o.updatedAt !== 'number') return null;
		return { items: o.items as PendingApplication[], updatedAt: o.updatedAt };
	},
});

export const pendingApplicationsStore = {
	getSnapshot: store.getSnapshot,
	subscribe: store.subscribe,
	hydrateFromStorage: store.hydrateFromStorage,

	setItems(items: PendingApplication[]) {
		store.set({ items, updatedAt: Date.now() });
	},

	removeById(id: string) {
		store.update((prev) => {
			const items = prev.items.filter((x) => x.id !== id);
			if (items.length === prev.items.length) return prev;
			return { items, updatedAt: Date.now() };
		});
	},
};

export { broadcastApplicationsUpdated };
