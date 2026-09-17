import { clamp, DAY_END_MIN, DAY_SPAN_MIN, DAY_START_MIN, STEP_MINUTES } from './dateGrid';

/** Parses HH:mm into minutes since midnight, or null when malformed */
export function parseHHmm(v: string): number | null {
	const m = /^(\d{2}):(\d{2})$/.exec(v);
	if (!m) return null;
	const h = Number(m[1]);
	const mm = Number(m[2]);
	if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
	if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
	return h * 60 + mm;
}

export function fmtHHmm(totalMinutes: number): string {
	const m = ((totalMinutes % 1440) + 1440) % 1440;
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function addMinutes(hhmm: string, delta: number): string {
	const m = parseHHmm(hhmm);
	return m == null ? hhmm : fmtHHmm(m + delta);
}

/** Every selectable time in the calendar's 5-minute grid */
export function buildTimeOptions(): string[] {
	const out: string[] = [];
	for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += STEP_MINUTES) out.push(fmtHHmm(m));
	return out;
}

/** Snaps a pointer position inside a day column to the nearest grid minute */
export function minuteFromClientY(sheetEl: HTMLElement, clientY: number): number {
	const rect = sheetEl.getBoundingClientRect();
	const ratio = clamp((clientY - rect.top) / rect.height, 0, 1);
	const raw = DAY_START_MIN + ratio * DAY_SPAN_MIN;
	return clamp(Math.round(raw / STEP_MINUTES) * STEP_MINUTES, DAY_START_MIN, DAY_END_MIN);
}
