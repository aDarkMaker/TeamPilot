import type { NewcomerApplicationView } from '../../types/recruitmentUi';
import { fetchApplications } from './recruitmentClient';

type State = {
	items: NewcomerApplicationView[];
	loading: boolean;
	error: string | null;
	updatedAt: number;
};

const serverSnapshot: State = { items: [], loading: true, error: null, updatedAt: 0 };
let state: State = serverSnapshot;
const listeners = new Set<() => void>();

function emit() {
	for (const l of listeners) l();
}

function setState(patch: Partial<State>) {
	state = { ...state, ...patch };
	emit();
}

let inflight: Promise<void> | null = null;
async function refreshInternal(): Promise<void> {
	if (inflight) return inflight;
	inflight = (async () => {
		setState({ loading: true, error: null });
		try {
			const list = await fetchApplications();
			setState({ items: list, loading: false, error: null, updatedAt: Date.now() });
		} catch (e) {
			setState({ loading: false, error: e instanceof Error ? e.message : '加载报名列表失败' });
		} finally {
			inflight = null;
		}
	})();
	return inflight;
}

let sseStarted = false;
let sse: EventSource | null = null;

function startSseOnce() {
	if (typeof window === 'undefined') return;
	if (sseStarted) return;
	sseStarted = true;

	try {
		sse = new EventSource('/api/recruitment/events');
		sse.addEventListener('applications_updated', () => {
			void refreshInternal();
		});
	} catch {
		// ignore: SSE not supported / blocked
	}

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') void refreshInternal();
	});

	// 首次启动时立刻拉一次
	void refreshInternal();
}

export const recruitmentApplicationsStore = {
	getSnapshot(): State {
		return state;
	},

	getServerSnapshot(): State {
		return serverSnapshot;
	},

	subscribe(listener: () => void) {
		startSseOnce();
		listeners.add(listener);
		return () => listeners.delete(listener);
	},

	refresh() {
		startSseOnce();
		return refreshInternal();
	},

	disposeSseForTests() {
		sse?.close();
		sse = null;
		sseStarted = false;
	},
};

