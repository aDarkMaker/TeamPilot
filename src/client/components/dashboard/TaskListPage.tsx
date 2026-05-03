import { useEffect, useMemo, useState } from 'react';
import { DashboardToast, useDashboardToast } from './DashboardToast';
import { decideTask, fetchMyTasks, type TaskCard, type TaskStatus } from '../../lib/tasks/taskClient';
import { formatCstDateTime } from '../../lib/timeCst';
import { useSearchHighlight } from '../../lib/useSearchHighlight';

type TaskPayload = {
	startAtIso?: string;
	year?: number;
	month?: number;
	day?: number;
	startAt?: string;
};

function fmtTime(iso: string | null | undefined): string {
	return formatCstDateTime(iso);
}

function parsePayload(raw: string | null): TaskPayload | null {
	if (!raw) return null;
	try {
		const x = JSON.parse(raw) as TaskPayload;
		return x && typeof x === 'object' ? x : null;
	} catch {
		return null;
	}
}

function cstFieldsToUtcIso(input: { year: number; month: number; day: number; startAt: string }): string | null {
	const [h = Number.NaN, m = Number.NaN] = input.startAt.split(':').map(Number);
	if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
	const utcMs = Date.UTC(input.year, input.month - 1, input.day, h - 8, m, 0);
	return new Date(utcMs).toISOString();
}

function taskStartIso(task: TaskCard): string | null {
	const payload = parsePayload(task.payloadJson);
	if (
		typeof payload?.year === 'number' &&
		typeof payload?.month === 'number' &&
		typeof payload?.day === 'number' &&
		typeof payload?.startAt === 'string'
	) {
		const iso = cstFieldsToUtcIso({
			year: payload.year,
			month: payload.month,
			day: payload.day,
			startAt: payload.startAt,
		});
		if (iso) return iso;
	}
	return payload?.startAtIso ?? null;
}

function isStarted(task: TaskCard): boolean {
	const iso = taskStartIso(task);
	if (!iso) return false;
	const t = new Date(iso);
	if (Number.isNaN(t.getTime())) return false;
	return Date.now() >= t.getTime();
}

function statusText(s: TaskStatus): string {
	if (s === 'accepted') return '已接受';
	if (s === 'leave') return '已请假';
	return '待处理';
}

function statusBadge(task: TaskCard, started: boolean): { label: string; className: string } {
	if (started && task.status === 'pending') {
		return { label: '已截止', className: 'deadline' };
	}
	return { label: statusText(task.status), className: task.status };
}

export default function TaskListPage() {
	const toast = useDashboardToast();
	const { highlightText } = useSearchHighlight();
	const [items, setItems] = useState<TaskCard[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'all' | TaskStatus>('all');

	const load = async () => {
		setLoading(true);
		try {
			const rows = await fetchMyTasks({ limit: 80, offset: 0 });
			setItems(rows);
		} catch (e) {
			toast.show({ text: e instanceof Error ? e.message : '加载任务失败', type: 'err' });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, []);

	const list = useMemo(() => {
		if (activeTab === 'all') return items;
		return items.filter((x) => x.status === activeTab);
	}, [items, activeTab]);

	const onDecide = async (task: TaskCard, status: 'accepted' | 'leave') => {
		if (task.status === status) return;
		if (isStarted(task)) {
			toast.show({ text: '现在想改，晚了～', type: 'info' });
			return;
		}
		setBusyId(task.id);
		try {
			const updated = await decideTask(task.id, status);
			setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
			toast.show({ text: status === 'accepted' ? '我为你的勤劳而喜悦' : '我为你的懒惰不喜悦', type: 'ok', durationMs: 1800 });
		} catch (e) {
			toast.show({ text: e instanceof Error ? e.message : '更新状态失败', type: 'err' });
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="task-page">
			<DashboardToast toast={toast.toast} />

			<div className="task-head">
				<div className="task-tabs">
					<button type="button" className={`task-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
						全部
					</button>
					<button type="button" className={`task-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
						待处理
					</button>
					<button type="button" className={`task-tab ${activeTab === 'accepted' ? 'active' : ''}`} onClick={() => setActiveTab('accepted')}>
						已接受
					</button>
					<button type="button" className={`task-tab ${activeTab === 'leave' ? 'active' : ''}`} onClick={() => setActiveTab('leave')}>
						已请假
					</button>
				</div>
				<button type="button" className="task-refresh-btn" onClick={() => void load()} disabled={loading}>
					刷新
				</button>
			</div>

			{loading && items.length === 0 ? <div className="task-empty">加载中…</div> : null}
			{!loading && list.length === 0 ? <div className="task-empty">暂无任务</div> : null}

			<div className="task-list">
				{list.map((task) => {
					const started = isStarted(task);
					const done = task.status !== 'pending' || started;
					const startIso = taskStartIso(task);
					const badge = statusBadge(task, started);

					return (
						<article key={task.id} className={`task-card ${done ? 'is-done' : ''}`}>
							<div className="task-card-row">
								<h3>{highlightText(task.title)}</h3>
								<span className={`task-status ${badge.className}`}>{badge.label}</span>
							</div>
							<div className="task-meta">
								创建时间：{fmtTime(task.createdAt)}
								{startIso ? ` · 开始时间：${fmtTime(startIso)}` : ''}
							</div>
							{task.content ? <div className="task-content">{highlightText(task.content)}</div> : null}

							<div className="task-actions">
								<button
									type="button"
									className={`task-action ${task.status === 'accepted' ? 'active' : ''}`}
									disabled={busyId === task.id || started || task.status === 'accepted'}
									onClick={() => void onDecide(task, 'accepted')}
								>
									接受
								</button>
								<button
									type="button"
									className={`task-action ${task.status === 'leave' ? 'active' : ''}`}
									disabled={busyId === task.id || started || task.status === 'leave'}
									onClick={() => void onDecide(task, 'leave')}
								>
									请假
								</button>
							</div>
						</article>
					);
				})}
			</div>
		</div>
	);
}

