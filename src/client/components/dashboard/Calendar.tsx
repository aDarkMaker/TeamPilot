import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { dayKey, scheduleStore, broadcastScheduleUpdated, type Role, type ScheduleDayItem } from '../../lib/scheduleStore';
import { DashboardToast, useDashboardToast } from './DashboardToast';

type MentionUser = {
	id: string;
	username: string;
	nickname?: string | null;
	role?: 'user' | 'admin' | 'super_admin';
	avatarUrl?: string | null;
};
type Me = { id: string; username: string; role: Role };

const now = new Date();

const SERVER_SCHEDULE_SNAPSHOT: {
	byDay: Record<string, { items: ScheduleDayItem[]; updatedAt: number }>;
} = {
	byDay: {},
};

function toYmd(d: Date) {
	return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function ymdToIso(ymd: { year: number; month: number; day: number }) {
	return `${ymd.year}-${String(ymd.month).padStart(2, '0')}-${String(ymd.day).padStart(2, '0')}`;
}

function addDays(d: Date, delta: number) {
	const x = new Date(d);
	x.setDate(x.getDate() + delta);
	return x;
}

function startOfWeekMonday(d: Date) {
	const day = d.getDay();
	const diff = (day + 6) % 7;
	return addDays(d, -diff);
}

const START_HOUR = 8;
const END_HOUR = 23;
const STEP_MINUTES = 5;

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

function parseHHmm(v: string): number | null {
	const m = /^(\d{2}):(\d{2})$/.exec(v);
	if (!m) return null;
	const h = Number(m[1]);
	const mm = Number(m[2]);
	if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
	if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
	return h * 60 + mm;
}

function fmtHHmm(totalMinutes: number): string {
	const m = ((totalMinutes % 1440) + 1440) % 1440;
	const h = Math.floor(m / 60);
	const mm = m % 60;
	return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function addMinutes(hhmm: string, delta: number): string {
	const m = parseHHmm(hhmm);
	if (m == null) return hhmm;
	return fmtHHmm(m + delta);
}

type BlockLayout = {
	item: ScheduleDayItem;
	top: number;
	height: number;
	leftPct: number;
	widthPct: number;
};

type DraftRange = {
	dayKey: string;
	day: { year: number; month: number; day: number };
	startMin: number;
	endMin: number;
	active: boolean;
};

function layoutDayBlocks(items: ScheduleDayItem[]): BlockLayout[] {
	const dayStart = START_HOUR * 60;
	const dayEnd = END_HOUR * 60;
	const parsed = items
		.map((item) => {
			const s = parseHHmm(item.startAt);
			const e = parseHHmm(item.endAt);
			if (s == null || e == null) return null;
			const start = clamp(s, dayStart, dayEnd);
			let endRaw = clamp(e, dayStart, dayEnd);
			if (endRaw <= start) {
				const dur = Math.max(5, Number(item.durationMinutes) || 60);
				endRaw = clamp(start + dur, dayStart, dayEnd);
			}
			const safeEnd = Math.max(endRaw, start + 5);
			return { item, start, end: safeEnd };
		})
		.filter(Boolean) as Array<{ item: ScheduleDayItem; start: number; end: number }>;

	parsed.sort((a, b) => a.start - b.start || a.end - b.end);

	type Active = { end: number; col: number };
	let active: Active[] = [];
	let maxCol = 0;
	const placed: Array<{ item: ScheduleDayItem; start: number; end: number; col: number; colCount: number }> = [];

	for (const it of parsed) {
		active = active.filter((a) => a.end > it.start);
		const used = new Set(active.map((a) => a.col));
		let col = 0;
		while (used.has(col)) col++;
		active.push({ end: it.end, col });
		maxCol = Math.max(maxCol, col + 1);
		placed.push({ ...it, col, colCount: 1 });
	}

	for (const p of placed) {
		const overlaps = placed.filter((x) => !(x.end <= p.start || x.start >= p.end));
		const cols = new Set(overlaps.map((x) => x.col));
		p.colCount = Math.max(1, cols.size);
	}

	const minuteSpan = dayEnd - dayStart;
	return placed.map((p) => {
		const top = ((p.start - dayStart) / minuteSpan) * 100;
		const height = ((p.end - p.start) / minuteSpan) * 100;
		const widthPct = 100 / p.colCount;
		const leftPct = p.col * widthPct;
		return { item: p.item, top, height, leftPct, widthPct };
	});
}

export default function Calendar() {
	const descRef = useRef<HTMLTextAreaElement | null>(null);
	const memberInputRef = useRef<HTMLInputElement | null>(null);
	const avatarLoadedRef = useRef<Map<string, string>>(new Map());
	const [, forceAvatarTick] = useState(0);
	const [me, setMe] = useState<Me | null>(null);

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [location, setLocation] = useState('');
	const [anchorDate, setAnchorDate] = useState(() => new Date(now));
	const [selectedYmd, setSelectedYmd] = useState(() => toYmd(now));
	const [startAt, setStartAt] = useState('09:00');
	const [endAt, setEndAt] = useState('10:00');

	const [participants, setParticipants] = useState<MentionUser[]>([]);
	const [scope, setScope] = useState<'self' | 'all' | 'custom'>('self');
	const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
	const [mentionOpen, setMentionOpen] = useState(false);
	const [memberQuery, setMemberQuery] = useState('');

	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const toast = useDashboardToast();
	const [createErr, setCreateErr] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);
	const [timePicker, setTimePicker] = useState<{ open: boolean; field: 'start' | 'end' | null }>({ open: false, field: null });
	const [detail, setDetail] = useState<ScheduleDayItem | null>(null);
	const [editId, setEditId] = useState<string | null>(null);
	const [closing, setClosing] = useState<{ create: boolean; time: boolean; detail: boolean }>({ create: false, time: false, detail: false });
	const [draftRange, setDraftRange] = useState<DraftRange | null>(null);

	useEffect(() => {
		if (!timePicker.open) return;
		const active = document.querySelector<HTMLButtonElement>('.time-picker-item.active');
		active?.scrollIntoView({ block: 'center' });
	}, [timePicker.open, timePicker.field]);

	const weekStart = useMemo(() => startOfWeekMonday(anchorDate), [anchorDate]);
	const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);
	const weekLabel = useMemo(() => {
		const y = weekStart.getFullYear();
		const m = weekStart.getMonth() + 1;
		return `${y}年${m}月`;
	}, [weekStart]);

	const weekStartYmd = useMemo(() => toYmd(weekStart), [weekStart]);
	const weekStartIso = useMemo(() => ymdToIso(weekStartYmd), [weekStartYmd]);

	const dayKeys = useMemo(
		() =>
			weekDays.map((d) => {
				const ymd = toYmd(d);
				return { ymd, key: dayKey(ymd), label: `${ymd.month}/${ymd.day}` };
			}),
		[weekDays]
	);
	const storeState = useSyncExternalStore(
		scheduleStore.subscribe,
		scheduleStore.getSnapshot,
		() => SERVER_SCHEDULE_SNAPSHOT
	);
	const rowsByDay = useMemo(() => {
		const out: Record<string, ScheduleDayItem[]> = {};
		for (const d of dayKeys) out[d.key] = storeState.byDay[d.key]?.items ?? [];
		return out;
	}, [storeState.byDay, dayKeys]);

	const dateLabel = useMemo(() => {
		const d = new Date(selectedYmd.year, selectedYmd.month - 1, selectedYmd.day);
		const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()] ?? '';
		return `${selectedYmd.year}年${selectedYmd.month}月${selectedYmd.day}日 ${week}`;
	}, [selectedYmd]);
	const showBackToday = useMemo(() => {
		const t = toYmd(new Date());
		return selectedYmd.year !== t.year || selectedYmd.month !== t.month || selectedYmd.day !== t.day;
	}, [selectedYmd]);
	const layoutsByDay = useMemo(() => {
		const out: Record<string, BlockLayout[]> = {};
		for (const d of dayKeys) out[d.key] = layoutDayBlocks(rowsByDay[d.key] ?? []);
		return out;
	}, [rowsByDay, dayKeys]);
	const durationMinutes = useMemo(() => {
		const s = parseHHmm(startAt);
		const e = parseHHmm(endAt);
		if (s == null || e == null) return 0;
		if (e <= s) return 0;
		return Math.max(5, e - s);
	}, [startAt, endAt]);

	const timeOptions = useMemo(() => {
		const start = START_HOUR * 60;
		const end = END_HOUR * 60;
		const out: string[] = [];
		for (let m = start; m <= end; m += STEP_MINUTES) out.push(fmtHHmm(m));
		return out;
	}, []);

	function minuteFromClientY(sheetEl: HTMLElement, clientY: number) {
		const rect = sheetEl.getBoundingClientRect();
		const ratio = clamp((clientY - rect.top) / rect.height, 0, 1);
		const dayStart = START_HOUR * 60;
		const dayEnd = END_HOUR * 60;
		const raw = dayStart + ratio * (dayEnd - dayStart);
		const snapped = Math.round(raw / STEP_MINUTES) * STEP_MINUTES;
		return clamp(snapped, dayStart, dayEnd);
	}

	function openCreateAt(day: { year: number; month: number; day: number }, startMin: number, endMin: number) {
		const dayStart = START_HOUR * 60;
		const dayEnd = END_HOUR * 60;
		const safeStart = clamp(startMin, dayStart, dayEnd - 30);
		const safeEnd = clamp(Math.max(endMin, safeStart + 30), safeStart + 30, dayEnd);
		setSelectedYmd(day);
		setStartAt(fmtHHmm(safeStart));
		setEndAt(fmtHHmm(safeEnd));
		setEditId(null);
		setCreateErr(null);
		setModalOpen(true);
	}

	async function api<T>(url: string, init?: RequestInit): Promise<T> {
		const resp = await fetch(url, { credentials: 'include', ...init });
		const json = await resp.json().catch(() => ({}));
		if (!resp.ok || !json?.ok) throw new Error(json?.message || 'REQUEST_FAILED');
		return json.data as T;
	}

	async function cancelSchedule(id: string) {
		setErr(null);
		try {
			await api(`/api/schedule/${id}`, { method: 'DELETE' });
			setMsg('已取消');
			closeDetail();
			broadcastScheduleUpdated();
			await loadWeek();
		} catch (e) {
			setErr(e instanceof Error ? e.message : '取消失败');
		}
	}

	async function loadMe() {
		try {
			const u = await api<Me>('/api/users/me');
			setMe(u);
		} catch {
			setMe(null);
		}
	}

	async function loadWeek() {
		try {
			setErr(null);
			const data = await api<any[]>(`/api/schedule/week?start=${encodeURIComponent(weekStartIso)}`);
			const buckets: Record<string, ScheduleDayItem[]> = {};
			for (const d of dayKeys) buckets[d.key] = [];
			for (const it of data as any[]) {
				const k = dayKey({ year: it.year, month: it.month, day: it.day });
				(buckets[k] ?? (buckets[k] = [])).push(it as ScheduleDayItem);
			}
			for (const d of dayKeys) scheduleStore.setDayItems(d.key, buckets[d.key] ?? []);
		} catch (e) {
			setErr(e instanceof Error ? e.message : '加载失败');
		}
	}

	useEffect(() => {
		scheduleStore.hydrateFromStorage();
		void loadMe();
		void loadWeek();

		let disposed = false;
		const tick = async () => {
			if (disposed) return;
			await loadWeek();
		};
		const timer = window.setInterval(() => void tick(), 8000);

		const onVisible = () => {
			if (document.visibilityState === 'visible') void tick();
		};
		const onUpdated = (e: Event) => {
			const dk = (e as CustomEvent<{ dayKey?: string }>).detail?.dayKey;
			if (!dk || dayKeys.some((x) => x.key === dk)) void tick();
		};

		document.addEventListener('visibilitychange', onVisible);
		window.addEventListener('hxk:schedule-updated', onUpdated);

		return () => {
			disposed = true;
			window.clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
			window.removeEventListener('hxk:schedule-updated', onUpdated);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [weekStartIso]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setErr(null);
		setMsg(null);
		setCreateErr(null);
		try {
			const role = me?.role ?? 'user';
			const effectiveScope = role === 'user' ? 'self' : scope;

			const sMin = parseHHmm(startAt);
			const eMin = parseHHmm(endAt);
			if (sMin == null || eMin == null || eMin <= sMin) {
				setCreateErr('时间旅行者来了');
				return;
			}
			const dm = Math.max(5, eMin - sMin);

			const body = {
				title,
				scope: effectiveScope,
				participantIds: effectiveScope === 'custom' ? participants.map((p) => p.id) : [],
				description: description || null,
				year: selectedYmd.year,
				month: selectedYmd.month,
				day: selectedYmd.day,
				startAt,
				endAt,
				durationMinutes: dm,
				location: location || null,
			};

			if (editId) {
				await api(`/api/schedule/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
				setMsg('已更新');
			} else {
				await api('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
				setMsg('已创建');
			}

			setTitle('');
			setDescription('');
			setLocation('');
			setParticipants([]);
			setMemberQuery('');
			setEditId(null);
			closeCreate();
			broadcastScheduleUpdated();
			await loadWeek();
		} catch (e) {
			const m = e instanceof Error ? e.message : '提交失败';
			setCreateErr(m);
		} finally {
			setLoading(false);
		}
	}

	async function searchMention(keyword: string) {
		if (!keyword) {
			// still show list when only '@'
			try {
				const users = await api<MentionUser[]>(`/api/schedule/users/search?q=`);
				setMentionUsers(users);
				setMentionOpen(true);
			} catch {
				setMentionOpen(false);
			}
			return;
		}
		try {
			const users = await api<MentionUser[]>(`/api/schedule/users/search?q=${encodeURIComponent(keyword)}`);
			setMentionUsers(users);
			setMentionOpen(true);
		} catch {
			setMentionOpen(false);
		}
	}

	function onMemberQueryChange(v: string, cursorPos: number | null) {
		setMemberQuery(v);
		if (cursorPos == null) return;
		const before = v.slice(0, cursorPos);
		const m = before.match(/@([\u4e00-\u9fa5_a-zA-Z0-9]{0,20})$/);
		if (m) void searchMention(m[1] ?? '');
		else setMentionOpen(false);
	}

	function pickMention(u: MentionUser) {
		setParticipants((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]));
		setMentionOpen(false);
		setMemberQuery('');
		queueMicrotask(() => memberInputRef.current?.focus());
	}

	function removeParticipant(userId: string) {
		setParticipants((prev) => prev.filter((p) => p.id !== userId));
	}

	function closeCreate() {
		setClosing((p) => ({ ...p, create: true }));
		window.setTimeout(() => {
			setModalOpen(false);
			setClosing((p) => ({ ...p, create: false }));
		}, 180);
	}

	function closeTimePicker() {
		setClosing((p) => ({ ...p, time: true }));
		window.setTimeout(() => {
			setTimePicker({ open: false, field: null });
			setClosing((p) => ({ ...p, time: false }));
		}, 180);
	}

	function closeDetail() {
		setClosing((p) => ({ ...p, detail: true }));
		window.setTimeout(() => {
			setDetail(null);
			setClosing((p) => ({ ...p, detail: false }));
		}, 180);
	}

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			if (timePicker.open && !closing.time) closeTimePicker();
			else if (detail && !closing.detail) closeDetail();
			else if (modalOpen && !closing.create) closeCreate();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [timePicker.open, modalOpen, detail, closing.time, closing.create, closing.detail]);

	useEffect(() => {
		const s = parseHHmm(startAt);
		const e = parseHHmm(endAt);
		if (s == null || e == null) return;
		if (e <= s) {
			const dayEndMin = END_HOUR * 60;
			const candidate = Math.min(s + 60, dayEndMin);
			const safeMin = candidate <= s ? Math.min(s + 5, dayEndMin) : candidate;
			const next = fmtHHmm(safeMin);
			const n = parseHHmm(next);
			if (n != null && n > s && next !== endAt) setEndAt(next);
		}
	}, [startAt, endAt]);

	useEffect(() => {
		if (!draftRange?.active) return;
		const onUp = () => setDraftRange((prev) => (prev?.active ? { ...prev, active: false } : prev));
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
		return () => {
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
		};
	}, [draftRange?.active]);

	useEffect(() => {
		if (!err && !msg) return;
		toast.show({ text: err ?? msg ?? '', type: err ? 'err' : 'ok', durationMs: 3000 });
		setErr(null);
		setMsg(null);
	}, [err, msg, toast]);

	return (
		<div className="calendar-page">
			<DashboardToast toast={toast.toast} />
				<div className="calendar-head">
				<div className="calendar-head-title">
					<button type="button" className="calendar-date-btn" onClick={() => setAnchorDate((d) => addDays(d, -7))}>
						‹
					</button>
					<span>{dateLabel}</span>
					<button type="button" className="calendar-date-btn" onClick={() => setAnchorDate((d) => addDays(d, 7))}>
						›
					</button>
				</div>
				<div className="calendar-head-actions">
					{showBackToday && (
						<button
							type="button"
							className="calendar-btn"
							onClick={() => {
								const t = new Date();
								setAnchorDate(t);
								setSelectedYmd(toYmd(t));
							}}
						>
							返回今日
						</button>
					)}
					<button type="button" className="calendar-btn primary" onClick={() => setModalOpen(true)}>
						添加
					</button>
				</div>
			</div>

			<section className="calendar-card">
				<div className="calendar-card-head">
					<h2>日程</h2>
					<div className="calendar-sub">
						{dayKeys.reduce((sum, d) => sum + (rowsByDay[d.key]?.length ?? 0), 0)} 条
					</div>
				</div>
				<div className="calendar-week">
					<div className="calendar-week-head">
						<div className="calendar-week-head-left" />
						{dayKeys.map((d) => (
						<button
							key={d.key}
							type="button"
							className={`calendar-week-day ${d.ymd.year === selectedYmd.year && d.ymd.month === selectedYmd.month && d.ymd.day === selectedYmd.day ? 'active' : ''}`}
							onClick={() => setSelectedYmd(d.ymd)}
						>
								{d.label}
						</button>
						))}
					</div>
					<div className="calendar-week-body">
						<div className="calendar-timeline">
							{Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
								const h = i + START_HOUR;
								return (
									<div key={h} className="calendar-time">
										{String(h).padStart(2, '0')}:00
									</div>
								);
							})}
						</div>
						<div className="calendar-week-grid">
							{dayKeys.map((d) => (
								<div
									key={d.key}
									className="calendar-sheet"
									onPointerDown={(e) => {
										const target = e.target as HTMLElement;
										if (target.closest('.calendar-block')) return;
										const el = e.currentTarget as HTMLElement;
										const start = minuteFromClientY(el, e.clientY);
										setDraftRange({
											dayKey: d.key,
											day: d.ymd,
											startMin: start,
											endMin: clamp(start + STEP_MINUTES, START_HOUR * 60, END_HOUR * 60),
											active: true,
										});
									}}
									onPointerMove={(e) => {
										if (!draftRange?.active || draftRange.dayKey !== d.key) return;
										const el = e.currentTarget as HTMLElement;
										const cur = minuteFromClientY(el, e.clientY);
										setDraftRange((prev) =>
											prev && prev.dayKey === d.key ? { ...prev, endMin: cur } : prev
										);
									}}
									onPointerUp={() => {
										if (!draftRange?.active || draftRange.dayKey !== d.key) return;
										const start = Math.min(draftRange.startMin, draftRange.endMin);
										const end = Math.max(draftRange.startMin, draftRange.endMin);
										openCreateAt(d.ymd, start, end);
										setDraftRange(null);
									}}
									onPointerLeave={() => {
										// Keep draft when dragging across the same column edge.
									}}
								>
									{draftRange?.active && draftRange.dayKey === d.key ? (
										<div
											className="calendar-draft-block"
											style={{
												top: `${((Math.min(draftRange.startMin, draftRange.endMin) - START_HOUR * 60) / ((END_HOUR - START_HOUR) * 60)) * 100}%`,
												height: `${(Math.max(Math.abs(draftRange.endMin - draftRange.startMin), 30) / ((END_HOUR - START_HOUR) * 60)) * 100}%`,
											}}
										/>
									) : null}
									{(layoutsByDay[d.key] ?? []).map((b) => (
										<div
											key={b.item.id}
											className="calendar-block"
											style={{
												top: `${b.top}%`,
												height: `${b.height}%`,
												left: `${b.leftPct}%`,
												width: `${b.widthPct}%`,
											}}
											role="button"
											tabIndex={0}
											onClick={() => setDetail(b.item)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') setDetail(b.item);
											}}
										>
											<div className="calendar-block-title">{b.item.title}</div>
										</div>
									))}
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{modalOpen && (
				<div
					className={`calendar-modal ${closing.create ? 'closing' : 'open'}`}
					role="dialog"
					aria-modal="true"
					onClick={() => closeCreate()}
				>
					<div className="calendar-modal-card" onClick={(e) => e.stopPropagation()}>
						<div className="calendar-modal-head">
							<div className="calendar-modal-title">创建日程</div>
							<button type="button" className="calendar-btn" onClick={() => closeCreate()}>
								关闭
							</button>
						</div>
						{createErr && <div className="calendar-inline-msg err">{createErr}</div>}
						<form onSubmit={onSubmit} className="calendar-form">
							{me && me.role !== 'user' && (
								<div className="calendar-field">
									<label>范围</label>
									<div className="calendar-scope">
										<button type="button" className={`calendar-scope-btn ${scope === 'all' ? 'active' : ''}`} onClick={() => setScope('all')}>
											全体
										</button>
										<button
											type="button"
											className={`calendar-scope-btn ${scope === 'custom' ? 'active' : ''}`}
											onClick={() => setScope('custom')}
										>
											指定
										</button>
										<button type="button" className={`calendar-scope-btn ${scope === 'self' ? 'active' : ''}`} onClick={() => setScope('self')}>
											自己
										</button>
									</div>
								</div>
							)}

							<div className="calendar-field">
								<label htmlFor="cal-title">标题</label>
								<input id="cal-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
							</div>

							{me && me.role !== 'user' && scope === 'custom' && (
								<div className="calendar-field">
									<label htmlFor="cal-members">成员</label>
									<div className="calendar-members">
										<div className="calendar-members-chips">
											{participants.map((p) => (
												<button key={p.id} type="button" className="calendar-chip" onClick={() => removeParticipant(p.id)} title="移除">
													{(p.nickname && p.nickname.trim()) || p.username}
												</button>
											))}
											<input
												ref={memberInputRef}
												id="cal-members"
												className="calendar-members-input"
												value={memberQuery}
												onChange={(e) => onMemberQueryChange(e.target.value, e.currentTarget.selectionStart)}
												onKeyDown={(e) => {
													if (e.key === 'Backspace' && !memberQuery.trim() && participants.length) {
														removeParticipant(participants[participants.length - 1]!.id);
													}
												}}
												placeholder="@ 搜索成员"
												autoComplete="off"
												autoCorrect="off"
												autoCapitalize="off"
												spellCheck={false}
												inputMode="text"
												onFocus={() => {
													if (memberQuery.includes('@')) void searchMention('');
												}}
											/>
										</div>
										{mentionOpen && mentionUsers.length > 0 && (
											<div className="calendar-mention-list">
												{mentionUsers.map((u) => {
													const url = u.avatarUrl ?? null;
													const prev = avatarLoadedRef.current.get(u.id);
													const loaded = !!(prev && url && prev === url);
													if (prev && url && prev !== url) avatarLoadedRef.current.delete(u.id);
													return (
														<button key={u.id} type="button" className="calendar-mention-row" onClick={() => pickMention(u)}>
															<span className="avatar">
																{url ? (
																	<img
																		className={`avatar-img ${loaded ? 'loaded' : ''}`}
																		src={url}
																		alt=""
																		decoding="async"
																		loading="eager"
																		onLoad={() => {
																			if (!url) return;
																			avatarLoadedRef.current.set(u.id, url);
																			forceAvatarTick((x) => x + 1);
																		}}
																	/>
																) : null}
																<span className="avatar-fallback">{u.username.slice(0, 1)}</span>
															</span>
															<span className="name">{(u.nickname && u.nickname.trim()) || u.username}</span>
															<span className={`role ${u.role ?? 'user'}`}>{u.role === 'super_admin' ? '超管' : u.role === 'admin' ? '管理员' : '成员'}</span>
														</button>
													);
												})}
											</div>
										)}
									</div>
								</div>
							)}

							<div className="calendar-field">
								<label htmlFor="cal-desc2">描述</label>
								<textarea
									id="cal-desc2"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={4}
								/>
							</div>

							<div className="calendar-field">
								<label htmlFor="cal-loc">位置</label>
								<input id="cal-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
							</div>

							<div className="calendar-row">
								<div className="calendar-field">
									<label htmlFor="cal-start">开始</label>
									<button
										id="cal-start"
										type="button"
										className="calendar-time-btn"
										onClick={() => setTimePicker({ open: true, field: 'start' })}
									>
										{startAt}
									</button>
								</div>
								<div className="calendar-field">
									<label htmlFor="cal-end">结束</label>
									<button
										id="cal-end"
										type="button"
										className="calendar-time-btn"
										onClick={() => setTimePicker({ open: true, field: 'end' })}
									>
										{endAt}
									</button>
								</div>
								<div className="calendar-field">
									<label htmlFor="cal-dur">时长</label>
									<input id="cal-dur" type="text" value={`${durationMinutes} 分钟`} readOnly />
								</div>
							</div>

							<button type="submit" className="calendar-btn primary calendar-form-submit" disabled={loading}>
								{loading ? '提交中…' : '创建'}
							</button>
						</form>
					</div>
				</div>
			)}

			{timePicker.open && (
				<div className={`time-picker ${closing.time ? 'closing' : 'open'}`} role="dialog" aria-modal="true" onClick={() => closeTimePicker()}>
					<div className="time-picker-card" onClick={(e) => e.stopPropagation()}>
						<div className="time-picker-head">
							<div className="time-picker-title">{timePicker.field === 'start' ? '开始' : '结束'}</div>
							<button type="button" className="calendar-btn" onClick={() => closeTimePicker()}>
								关闭
							</button>
						</div>
						<div className="time-picker-list">
							{timeOptions.map((t) => (
								<button
									key={t}
									type="button"
									className={`time-picker-item ${t === (timePicker.field === 'start' ? startAt : endAt) ? 'active' : ''}`}
									onClick={() => {
										if (timePicker.field === 'start') {
											setStartAt(t);
											const s = parseHHmm(t);
											const e = parseHHmm(endAt);
											if (s != null && e != null && e <= s) setEndAt(addMinutes(t, 60));
										} else {
											setEndAt(t);
										}
										closeTimePicker();
									}}
								>
									{t}
								</button>
							))}
						</div>
					</div>
				</div>
			)}

			{detail && (
				<div className={`calendar-modal ${closing.detail ? 'closing' : 'open'}`} role="dialog" aria-modal="true" onClick={() => closeDetail()}>
					<div className="calendar-modal-card" onClick={(e) => e.stopPropagation()}>
						<div className="calendar-modal-head">
							<div className="calendar-modal-title">详情</div>
							<div className="calendar-modal-head-actions">
								{me?.id && detail.createdBy && me.id === detail.createdBy && (
									<button
										type="button"
										className="calendar-btn danger"
										onClick={() => void cancelSchedule(detail.id)}
									>
										取消
									</button>
								)}
								{me?.id && detail.createdBy && me.id === detail.createdBy && (
									<button
										type="button"
										className="calendar-btn"
										onClick={() => {
											setEditId(detail.id);
											setTitle(detail.title);
											setDescription(detail.description ?? '');
											setLocation(detail.location ?? '');
											setSelectedYmd({ year: detail.year, month: detail.month, day: detail.day });
											setStartAt(detail.startAt);
											setEndAt(detail.endAt);
											setParticipants(
												(detail.participants ?? []).map((p) => ({
													id: p.userId,
													username: p.username,
													avatarUrl: p.avatarUrl ?? null,
												}))
											);
											setTimePicker({ open: false, field: null });
											setModalOpen(true);
											closeDetail();
										}}
									>
										编辑
									</button>
								)}
								<button type="button" className="calendar-btn" onClick={() => closeDetail()}>
									关闭
								</button>
							</div>
						</div>
						<div className="calendar-detail">
							<div className="calendar-detail-title">{detail.title}</div>
							<div className="calendar-detail-line">
								<span className="pill">
									{detail.startAt} ～ {detail.endAt}
								</span>
								{detail.location ? <span className="pill">{detail.location}</span> : null}
								<span className="pill">{detail.durationMinutes} 分钟</span>
							</div>
							{detail.participants?.length ? (
								<div className="calendar-detail-people">
									{detail.participants.map((p) => (
										<div key={p.userId} className={`calendar-person ${p.taskStatus === 'leave' ? 'is-leave' : ''}`}>
											<span className="calendar-person-avatar">
												{p.avatarUrl ? (
													<img className="calendar-person-img" src={p.avatarUrl} alt="" decoding="async" loading="eager" />
												) : null}
												<span className="calendar-person-fallback">{p.username.slice(0, 1)}</span>
											</span>
											<span className="calendar-person-name">{p.username}</span>
											{p.taskStatus === 'leave' ? <span className="calendar-person-tag leave">已请假</span> : null}
										</div>
									))}
								</div>
							) : null}
							{detail.description ? <div className="calendar-detail-desc">{detail.description}</div> : null}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
