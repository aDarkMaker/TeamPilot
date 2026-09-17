import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { dayKey, scheduleStore, type ScheduleDayItem } from '@/lib/scheduleStore';
import { usePolling } from '@/lib/usePolling';
import { addDays, isSameYmd, startOfWeekMonday, toYmd, ymdToIso, type Ymd } from './dateGrid';
import { fetchWeek } from './calendarClient';

const POLL_INTERVAL_MS = 8000;

const SERVER_SNAPSHOT: { byDay: Record<string, { items: ScheduleDayItem[]; updatedAt: number }> } = { byDay: {} };

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * Owns the calendar's three navigation states (anchor week, selected day, entry
 * animation direction) plus the week fetch / store sync / polling loop.
 */
export function useCalendarWeek() {
	const today = useMemo(() => new Date(), []);
	const [anchorDate, setAnchorDate] = useState(() => new Date(today));
	const [selectedYmd, setSelectedYmd] = useState<Ymd>(() => toYmd(today));
	const [weekDir, setWeekDir] = useState<'prev' | 'next' | null>(null);
	const [error, setError] = useState<string | null>(null);

	const weekStart = useMemo(() => startOfWeekMonday(anchorDate), [anchorDate]);
	const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
	const weekStartIso = useMemo(() => ymdToIso(toYmd(weekStart)), [weekStart]);

	const dayKeys = useMemo(
		() =>
			weekDays.map((d) => {
				const ymd = toYmd(d);
				return { ymd, key: dayKey(ymd), label: `${ymd.month}/${ymd.day}` };
			}),
		[weekDays]
	);

	const state = useSyncExternalStore(scheduleStore.subscribe, scheduleStore.getSnapshot, () => SERVER_SNAPSHOT);

	const rowsByDay = useMemo(() => {
		const out: Record<string, ScheduleDayItem[]> = {};
		for (const d of dayKeys) out[d.key] = state.byDay[d.key]?.items ?? [];
		return out;
	}, [state.byDay, dayKeys]);

	const activeDayIdx = useMemo(() => dayKeys.findIndex((d) => isSameYmd(d.ymd, selectedYmd)), [dayKeys, selectedYmd]);

	const dateLabel = useMemo(() => {
		const d = new Date(selectedYmd.year, selectedYmd.month - 1, selectedYmd.day);
		return `${selectedYmd.year}年${selectedYmd.month}月${selectedYmd.day}日 ${WEEKDAY_LABELS[d.getDay()] ?? ''}`;
	}, [selectedYmd]);

	const showBackToday = useMemo(() => !isSameYmd(selectedYmd, toYmd(new Date())), [selectedYmd]);

	const loadWeek = useCallback(async () => {
		try {
			setError(null);
			const data = await fetchWeek(weekStartIso);

			const buckets: Record<string, ScheduleDayItem[]> = {};
			for (const d of dayKeys) buckets[d.key] = [];
			for (const it of data) {
				const k = dayKey({ year: it.year, month: it.month, day: it.day });
				(buckets[k] ?? (buckets[k] = [])).push(it);
			}
			for (const d of dayKeys) scheduleStore.setDayItems(d.key, buckets[d.key] ?? []);
		} catch (e) {
			setError(e instanceof Error ? e.message : '加载失败');
		}
	}, [weekStartIso, dayKeys]);

	useEffect(() => {
		scheduleStore.hydrateFromStorage();
	}, []);

	// Load immediately on mount and whenever the visible week changes, then
	// refresh on the shared 8s polling loop.
	useEffect(() => {
		void loadWeek();
	}, [loadWeek]);

	usePolling(loadWeek, POLL_INTERVAL_MS, [weekStartIso]);

	useEffect(() => {
		const onUpdated = (e: Event) => {
			const dk = (e as CustomEvent<{ dayKey?: string }>).detail?.dayKey;
			if (!dk || dayKeys.some((x) => x.key === dk)) void loadWeek();
		};
		window.addEventListener('hxk:schedule-updated', onUpdated);
		return () => window.removeEventListener('hxk:schedule-updated', onUpdated);
	}, [dayKeys, loadWeek]);

	const shiftWeek = useCallback((delta: number) => {
		setWeekDir(delta > 0 ? 'next' : 'prev');
		setAnchorDate((d) => addDays(d, delta));
	}, []);

	const goToday = useCallback(() => {
		const t = new Date();
		setWeekDir(null);
		setAnchorDate(t);
		setSelectedYmd(toYmd(t));
	}, []);

	return {
		anchorDate,
		setAnchorDate,
		selectedYmd,
		setSelectedYmd,
		weekDir,
		dayKeys,
		rowsByDay,
		activeDayIdx,
		dateLabel,
		showBackToday,
		error,
		setError,
		loadWeek,
		shiftWeek,
		goToday,
	};
}
