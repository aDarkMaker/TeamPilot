export type PersistedStore<T> = {
	getSnapshot(): T;
	subscribe(listener: () => void): () => void;
	/** Re-read localStorage (after another tab or the pre-hydration SSR markup) */
	hydrateFromStorage(): void;
	set(next: T): void;
	update(updater: (prev: T) => T): void;
};

type Options<T> = {
	storageKey: string;
	initial: T;
	/** Validates the persisted payload; return null to fall back to `initial` */
	parse: (raw: unknown) => T | null;
};

/**
 * localStorage-backed external store for useSyncExternalStore:
 * writes through on every update and notifies subscribers.
 */
export function createPersistedStore<T>({ storageKey, initial, parse }: Options<T>): PersistedStore<T> {
	function readPersisted(): T {
		if (typeof window === 'undefined') return initial;
		try {
			const raw = window.localStorage.getItem(storageKey);
			if (!raw) return initial;
			return parse(JSON.parse(raw)) ?? initial;
		} catch {
			return initial;
		}
	}

	let state: T = readPersisted();
	const listeners = new Set<() => void>();

	function emit() {
		for (const l of listeners) l();
	}

	function set(next: T) {
		state = next;
		if (typeof window !== 'undefined') {
			try {
				window.localStorage.setItem(storageKey, JSON.stringify(next));
			} catch {
				// ignore quota or privacy mode
			}
		}
		emit();
	}

	return {
		getSnapshot: () => state,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		hydrateFromStorage: () => set(readPersisted()),
		set,
		update: (updater) => set(updater(state)),
	};
}
