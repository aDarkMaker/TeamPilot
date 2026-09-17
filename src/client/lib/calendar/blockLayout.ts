import type { ScheduleDayItem } from '@/lib/scheduleStore';
import { clamp, DAY_END_MIN, DAY_SPAN_MIN, DAY_START_MIN } from './dateGrid';
import { parseHHmm } from './timeGrid';

export type BlockLayout = {
	item: ScheduleDayItem;
	/** Percentages relative to the day column */
	top: number;
	height: number;
	leftPct: number;
	widthPct: number;
};

type Placed = { item: ScheduleDayItem; start: number; end: number; col: number; colCount: number };

/**
 * Lays out one day's schedules as absolutely-positioned blocks.
 * Overlapping items share the column width; everything is clamped to the visible 08:00-23:00 range.
 */
export function layoutDayBlocks(items: ScheduleDayItem[]): BlockLayout[] {
	const parsed = items
		.map((item) => {
			const s = parseHHmm(item.startAt);
			const e = parseHHmm(item.endAt);
			if (s == null || e == null) return null;

			const start = clamp(s, DAY_START_MIN, DAY_END_MIN);
			let end = clamp(e, DAY_START_MIN, DAY_END_MIN);
			if (end <= start) {
				const dur = Math.max(5, Number(item.durationMinutes) || 60);
				end = clamp(start + dur, DAY_START_MIN, DAY_END_MIN);
			}
			return { item, start, end: Math.max(end, start + 5) };
		})
		.filter((x): x is { item: ScheduleDayItem; start: number; end: number } => x !== null);

	parsed.sort((a, b) => a.start - b.start || a.end - b.end);

	// Greedy column assignment: reuse the leftmost column whose previous item already ended.
	let active: Array<{ end: number; col: number }> = [];
	const placed: Placed[] = [];

	for (const it of parsed) {
		active = active.filter((a) => a.end > it.start);
		const used = new Set(active.map((a) => a.col));
		let col = 0;
		while (used.has(col)) col++;
		active.push({ end: it.end, col });
		placed.push({ ...it, col, colCount: 1 });
	}

	// Each block takes an equal share of the columns it overlaps with.
	for (const p of placed) {
		const overlaps = placed.filter((x) => !(x.end <= p.start || x.start >= p.end));
		p.colCount = Math.max(1, new Set(overlaps.map((x) => x.col)).size);
	}

	return placed.map((p) => {
		const widthPct = 100 / p.colCount;
		return {
			item: p.item,
			top: ((p.start - DAY_START_MIN) / DAY_SPAN_MIN) * 100,
			height: ((p.end - p.start) / DAY_SPAN_MIN) * 100,
			widthPct,
			leftPct: p.col * widthPct,
		};
	});
}
