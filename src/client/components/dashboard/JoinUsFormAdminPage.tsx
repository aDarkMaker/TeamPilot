import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormConfig, Question } from '../../lib/joinus/form';
import { DashboardToast, useDashboardToast } from './DashboardToast';
import JoinUsSelect from './JoinUsSelect';
import { INTERVIEW_OFFLINE_FIELD, INTERVIEW_ONLINE_FIELD } from '../../../joinus/interviewIntro';

type Role = 'user' | 'admin' | 'super_admin';
type Me = { role: Role };

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
	const res = await fetch(input, { credentials: 'include', ...init });
	const json = await res.json().catch(() => ({}));
	if (!res.ok || !json?.ok) {
		const m = typeof json?.message === 'string' && json.message ? json.message : '请求失败了，稍后再试';
		throw new Error(m);
	}
	return json.data as T;
}

function isStaff(role: Role | undefined) {
	return role === 'admin' || role === 'super_admin';
}

function isInterviewQuestion(id: string) {
	return id === INTERVIEW_OFFLINE_FIELD || id === INTERVIEW_ONLINE_FIELD;
}

function showWhenText(q: Question): string {
	if (!q.showWhen) return '—';
	const v = Array.isArray(q.showWhen.value) ? q.showWhen.value.join(' / ') : q.showWhen.value;
	return `当 ${q.showWhen.questionId} = ${v}`;
}

type InterviewWindow = { id: string; date: string; startMin: number; endMin: number; total: number; booked: number };
type WindowDraft = { date: string; startMin: number | null; count: number };

const EMPTY_DRAFT: WindowDraft = { date: '', startMin: null, count: 1 };

const SLOT_MINUTES = 15;
const MIN_START_MIN = 8 * 60;
const MAX_START_MIN = 20 * 60;
const MIN_COUNT = 1;
const MAX_COUNT = 16;

const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function minutesToTime(min: number): string {
	return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

function shanghaiTodayIso(): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(new Date());
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}`;
}

function dateOptions(days: number): Array<{ value: string; label: string }> {
	const [y, m, d] = shanghaiTodayIso().split('-').map(Number);
	const base = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
	const out: Array<{ value: string; label: string }> = [];
	for (let i = 0; i < days; i++) {
		const dt = new Date(base.getTime() + i * 86400000);
		const value = `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
		out.push({ value, label: `${dt.getUTCMonth() + 1}月${dt.getUTCDate()}日 ${WEEK_CN[dt.getUTCDay()]}` });
	}
	return out;
}

const DATE_PICKER_OPTIONS = dateOptions(60);

function startTimeOptions(): Array<{ value: number; label: string }> {
	const out: Array<{ value: number; label: string }> = [];
	for (let m = MIN_START_MIN; m <= MAX_START_MIN; m += 5) {
		out.push({ value: m, label: minutesToTime(m) });
	}
	return out;
}

const START_TIME_OPTIONS = startTimeOptions();

function countOptions(): Array<{ value: number; label: string }> {
	const out: Array<{ value: number; label: string }> = [];
	for (let c = MIN_COUNT; c <= MAX_COUNT; c++) {
		const mins = c * SLOT_MINUTES;
		out.push({ value: c, label: `${c} 段（${mins} 分钟）` });
	}
	return out;
}

const COUNT_OPTIONS = countOptions();

function dateLabel(date: string): string {
	const parts = date.split('-');
	return `${Number(parts[1])}月${Number(parts[2])}日`;
}

function windowRangeLabel(w: Pick<InterviewWindow, 'date' | 'startMin' | 'endMin'>): string {
	return `${dateLabel(w.date)} ${minutesToTime(w.startMin)}-${minutesToTime(w.endMin)}`;
}

function draftEndMin(d: WindowDraft): number | null {
	if (d.startMin == null) return null;
	return d.startMin + d.count * SLOT_MINUTES;
}

export default function JoinUsFormAdminPage() {
	const [me, setMe] = useState<Me | null>(null);
	const [form, setForm] = useState<FormConfig | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const toast = useDashboardToast();

	const [windows, setWindows] = useState<InterviewWindow[]>([]);
	const [draft, setDraft] = useState<WindowDraft>(EMPTY_DRAFT);
	const [windowBusy, setWindowBusy] = useState(false);
	const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

	const staff = isStaff(me?.role);

	const otherQuestions = useMemo(() => form?.questions.filter((q) => !isInterviewQuestion(q.id)) ?? [], [form]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				setErr(null);
				const meData = await api<Me>('/api/users/me');
				if (cancelled) return;
				setMe(meData);
				if (!isStaff(meData.role)) return;
				const data = await api<FormConfig>('/api/joinus/form');
				if (cancelled) return;
				setForm(data);
			} catch (e) {
				if (!cancelled) setErr(e instanceof Error ? e.message : '出了点未知状况');
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const loadWindows = useCallback(async () => {
		try {
			const data = await api<InterviewWindow[]>('/api/joinus/timeslots');
			setWindows(data);
		} catch (e) {
			setErr(e instanceof Error ? e.message : '加载排期失败');
		}
	}, []);

	useEffect(() => {
		if (!staff) return;
		void loadWindows();
	}, [staff, loadWindows]);

	useEffect(() => {
		if (!err) return;
		toast.show({ text: err, type: 'err', durationMs: 3000 });
		setErr(null);
	}, [err, toast]);

	const updateQuestion = (id: string, patch: Partial<Question>) => {
		setForm((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				questions: prev.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
			};
		});
	};

	const onCreateWindow = async () => {
		const endMin = draftEndMin(draft);
		if (!draft.date || draft.startMin == null || endMin == null) {
			toast.show({ text: '请选择日期、开始时间与时段个数', type: 'err', durationMs: 2500 });
			return;
		}
		if (draftConflict()) {
			toast.show({ text: '与已有排期重叠，请调整后重试', type: 'err', durationMs: 2500 });
			return;
		}
		setWindowBusy(true);
		try {
			await api<InterviewWindow>('/api/joinus/timeslots', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ date: draft.date, startMin: draft.startMin, endMin }),
			});
			setDraft(EMPTY_DRAFT);
			await loadWindows();
			toast.show({ text: '已添加面试时间', type: 'ok', durationMs: 2000 });
		} catch (e) {
			setErr(e instanceof Error ? e.message : '添加失败');
		} finally {
			setWindowBusy(false);
		}
	};

	const onDeleteWindow = async (windowId: string) => {
		setDeleteBusyId(windowId);
		try {
			await api(`/api/joinus/timeslots/${windowId}`, { method: 'DELETE' });
			await loadWindows();
			toast.show({ text: '已删除', type: 'ok', durationMs: 2000 });
		} catch (e) {
			setErr(e instanceof Error ? e.message : '删除失败');
		} finally {
			setDeleteBusyId(null);
		}
	};

	const draftConflict = (): InterviewWindow | null => {
		const end = draftEndMin(draft);
		if (!draft.date || draft.startMin == null || end == null) return null;
		return windows.find((w) => w.date === draft.date && draft.startMin! < w.endMin && w.startMin < end) ?? null;
	};

	const onSave = async () => {
		if (!form || !staff) return;
		setBusy(true);
		try {
			const body = {
				title: form.title,
				subtitle: form.subtitle,
				welcome: form.welcome,
				questions: form.questions.map((q) => {
					const item: { id: string; label: string; placeholder?: string } = {
						id: q.id,
						label: q.label,
					};
					if (q.placeholder !== undefined) item.placeholder = q.placeholder;
					return item;
				}),
			};
			const data = await api<FormConfig>('/api/joinus/form', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			setForm(data);
			toast.show({ text: '已保存', type: 'ok', durationMs: 2000 });
		} catch (e) {
			setErr(e instanceof Error ? e.message : '保存失败');
		} finally {
			setBusy(false);
		}
	};

	if (me && !staff) {
		return <p className="joinus-form-admin-forbidden">这里没有管理员权限哦</p>;
	}

	if (!form) {
		return <p className="joinus-form-admin-forbidden">{me ? '加载中…' : '加载中…'}</p>;
	}

	const draftEnd = draftEndMin(draft);
	const conflict = draftConflict();

	return (
		<div className="joinus-form-admin">
			<DashboardToast toast={toast.toast} />

			<section className="joinus-form-admin-card">
				<div className="joinus-form-admin-card-head">
					<h2>表单文案</h2>
				</div>
				<div className="joinus-form-admin-grid joinus-form-admin-grid-2">
					<div className="joinus-form-admin-field">
						<label htmlFor="jf-title">标题</label>
						<input id="jf-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
					</div>
					<div className="joinus-form-admin-field">
						<label htmlFor="jf-subtitle">副标题</label>
						<input id="jf-subtitle" value={form.subtitle ?? ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
					</div>
					<div className="joinus-form-admin-field joinus-form-admin-field-wide">
						<label htmlFor="jf-welcome">欢迎语</label>
						<textarea id="jf-welcome" value={form.welcome ?? ''} onChange={(e) => setForm({ ...form, welcome: e.target.value })} />
					</div>
				</div>
			</section>

			<section className="joinus-form-admin-card">
				<div className="joinus-form-admin-card-head">
					<h2>题目文案</h2>
				</div>
				{otherQuestions.map((q) => (
					<div key={q.id} className="joinus-form-admin-question">
						<div className="joinus-form-admin-question-meta">
							{q.id} · {q.type}
							{q.showWhen ? ` · ${showWhenText(q)}` : ''}
						</div>
						<div className="joinus-form-admin-grid joinus-form-admin-grid-2">
							<div className="joinus-form-admin-field">
								<label>标签</label>
								<input value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })} />
							</div>
							{(q.type === 'input' || q.type === 'select' || q.type === 'boolean' || q.type === 'file') && (
								<div className="joinus-form-admin-field">
									<label>占位提示</label>
									<input value={q.placeholder ?? ''} onChange={(e) => updateQuestion(q.id, { placeholder: e.target.value })} />
								</div>
							)}
						</div>
					</div>
				))}
			</section>

			<section className="joinus-form-admin-card">
				<div className="joinus-form-admin-card-head">
					<h2>面试排期</h2>
				</div>
				<div className="joinus-schedule-mode">
					<div className="joinus-schedule-mode-head">
						<h3>线上 / 线下共用时段</h3>
						<span className="joinus-schedule-mode-trigger">15 分钟 / 1 人，线上与线下不分开设置</span>
					</div>
					<div className="joinus-schedule-windows">
						{windows.map((w) => (
							<div key={w.id} className="joinus-schedule-window">
								<span className="joinus-schedule-window-range">{windowRangeLabel(w)}</span>
								<span className={`joinus-schedule-window-count ${w.booked > 0 ? 'is-booked' : ''}`}>
									{w.booked > 0 ? `已约 ${w.booked}/${w.total}` : `可约 ${w.total}`}
								</span>
								<button
									type="button"
									className="joinus-form-admin-btn danger small"
									disabled={w.booked > 0 || deleteBusyId === w.id}
									title={w.booked > 0 ? '已有报名预约，不可删除' : undefined}
									onClick={() => void onDeleteWindow(w.id)}
								>
									{deleteBusyId === w.id ? '删除中…' : '删除'}
								</button>
							</div>
						))}
						{windows.length === 0 ? <p className="joinus-schedule-empty">还没有设置可约时间</p> : null}
					</div>
					<div className="joinus-schedule-add">
						<JoinUsSelect
							options={DATE_PICKER_OPTIONS}
							value={draft.date || null}
							placeholder="日期"
							onChange={(v) => setDraft((prev) => ({ ...prev, date: v }))}
						/>
						<JoinUsSelect
							options={START_TIME_OPTIONS}
							value={draft.startMin}
							placeholder="开始"
							onChange={(v) => setDraft((prev) => ({ ...prev, startMin: v }))}
						/>
						<JoinUsSelect
							options={COUNT_OPTIONS}
							value={draft.count}
							placeholder="段数"
							onChange={(v) => setDraft((prev) => ({ ...prev, count: v }))}
						/>
						<button
							type="button"
							className="joinus-form-admin-btn small"
							disabled={windowBusy || conflict !== null}
							title={conflict ? '与已有排期重叠' : undefined}
							onClick={() => void onCreateWindow()}
						>
							{windowBusy ? '添加中…' : '添加'}
						</button>
						{conflict ? (
							<span className="joinus-schedule-add-hint is-error">与 {windowRangeLabel(conflict)} 重叠，无法添加</span>
						) : draft.startMin != null && draftEnd != null ? (
							<span className="joinus-schedule-add-hint">
								15 分钟/段 · 共 {draft.count} 段 · {minutesToTime(draft.startMin)}-{minutesToTime(draftEnd)}
							</span>
						) : null}
					</div>
				</div>
			</section>

			<div className="joinus-form-admin-actions">
				<button type="button" className="joinus-form-admin-btn primary" disabled={busy} onClick={() => void onSave()}>
					{busy ? '保存中…' : '保存'}
				</button>
			</div>
		</div>
	);
}
