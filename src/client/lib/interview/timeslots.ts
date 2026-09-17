/** Interview slot grid shared by the admin scheduler and its preview hints */

export const SLOT_MINUTES = 15;
export const MIN_START_MIN = 8 * 60;
export const MAX_START_MIN = 20 * 60;
export const MIN_COUNT = 1;
export const MAX_COUNT = 16;

const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export type InterviewWindow = { id: string; date: string; startMin: number; endMin: number; total: number; booked: number };
export type WindowDraft = { date: string; startMin: number | null; count: number };

export const EMPTY_WINDOW_DRAFT: WindowDraft = { date: '', startMin: null, count: 1 };

export type PickerOption<T> = { value: T; label: string };

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

export function minutesToTime(min: number): string {
	return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

/** Today's date in Asia/Shanghai, independent of the viewer's own timezone */
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

function dateOptions(days: number): Array<PickerOption<string>> {
	const [y, m, d] = shanghaiTodayIso().split('-').map(Number);
	const base = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
	const out: Array<PickerOption<string>> = [];
	for (let i = 0; i < days; i++) {
		const dt = new Date(base.getTime() + i * 86400000);
		const value = `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
		out.push({ value, label: `${dt.getUTCMonth() + 1}月${dt.getUTCDate()}日 ${WEEK_CN[dt.getUTCDay()]}` });
	}
	return out;
}

function startTimeOptions(): Array<PickerOption<number>> {
	const out: Array<PickerOption<number>> = [];
	for (let m = MIN_START_MIN; m <= MAX_START_MIN; m += 5) {
		out.push({ value: m, label: minutesToTime(m) });
	}
	return out;
}

function countOptions(): Array<PickerOption<number>> {
	const out: Array<PickerOption<number>> = [];
	for (let c = MIN_COUNT; c <= MAX_COUNT; c++) {
		out.push({ value: c, label: `${c} 段（${c * SLOT_MINUTES} 分钟）` });
	}
	return out;
}

export const DATE_PICKER_OPTIONS = dateOptions(60);
export const START_TIME_OPTIONS = startTimeOptions();
export const COUNT_OPTIONS = countOptions();

export function dateLabel(date: string): string {
	const parts = date.split('-');
	return `${Number(parts[1])}月${Number(parts[2])}日`;
}

export function windowRangeLabel(w: Pick<InterviewWindow, 'date' | 'startMin' | 'endMin'>): string {
	return `${dateLabel(w.date)} ${minutesToTime(w.startMin)}-${minutesToTime(w.endMin)}`;
}

/** End of the draft window, or null while the start time is still unset */
export function draftEndMin(d: WindowDraft): number | null {
	if (d.startMin == null) return null;
	return d.startMin + d.count * SLOT_MINUTES;
}

/** First existing window that overlaps the draft, if any */
export function findDraftConflict(windows: InterviewWindow[], draft: WindowDraft): InterviewWindow | null {
	const end = draftEndMin(draft);
	if (!draft.date || draft.startMin == null || end == null) return null;
	const start = draft.startMin;
	return windows.find((w) => w.date === draft.date && start < w.endMin && w.startMin < end) ?? null;
}
