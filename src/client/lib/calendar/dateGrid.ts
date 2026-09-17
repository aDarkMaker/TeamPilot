export type Ymd = { year: number; month: number; day: number };

export const START_HOUR = 8;
export const END_HOUR = 23;
export const STEP_MINUTES = 5;

/** Minutes covered by one rendered day column */
export const DAY_START_MIN = START_HOUR * 60;
export const DAY_END_MIN = END_HOUR * 60;
export const DAY_SPAN_MIN = DAY_END_MIN - DAY_START_MIN;

export function toYmd(d: Date): Ymd {
	return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function ymdToIso(ymd: Ymd): string {
	return `${ymd.year}-${String(ymd.month).padStart(2, '0')}-${String(ymd.day).padStart(2, '0')}`;
}

export function isSameYmd(a: Ymd, b: Ymd): boolean {
	return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function addDays(d: Date, delta: number): Date {
	const x = new Date(d);
	x.setDate(x.getDate() + delta);
	return x;
}

/** Weeks run Monday -> Sunday, matching the Chinese calendar convention */
export function startOfWeekMonday(d: Date): Date {
	const diff = (d.getDay() + 6) % 7;
	return addDays(d, -diff);
}

export function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}
