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
let refreshAgain = false;

async function refreshInternal(): Promise<void> {
	if (inflight) {
		refreshAgain = true;
		return inflight;
	}
	inflight = (async () => {
		do {
			refreshAgain = false;
			setState({ loading: state.items.length === 0, error: null });
			try {
				const list = await fetchApplications();
				setState({ items: list, loading: false, error: null, updatedAt: Date.now() });
			} catch (e) {
				setState({ loading: false, error: e instanceof Error ? e.message : '加载报名列表失败' });
			}
		} while (refreshAgain);
		inflight = null;
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
		sse.addEventListener('error', () => {
			// 静默处理 — 开发环境后端未启时不会污染控制台
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

	patchApplicationRating(
		applicationId: string,
		patch: { ratingAverage: number | null; ratingCount: number; myRating: number | null },
	) {
		setState({
			items: state.items.map((a) => (a.id === applicationId ? { ...a, ...patch } : a)),
			updatedAt: Date.now(),
		});
	},

	disposeSseForTests() {
		sse?.close();
		sse = null;
		sseStarted = false;
	},
};

