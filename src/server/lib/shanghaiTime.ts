import { AppError } from '../types/api';
import { getShanghaiNow } from '../../joinus/interviewSchedule';

export interface ScheduleTimeInput {
	year: number;
	month: number;
	day: number;
	startAt: string;
}

export function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

export function formatYmd(year: number, month: number, day: number): string {
	return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Today in Asia/Shanghai, formatted YYYY-MM-DD */
export function getShanghaiYmd(): string {
	return getShanghaiNow().date;
}

/** Current year/month in Asia/Shanghai */
export function getShanghaiYearMonth(): { year: number; month: number } {
	const [year, month] = getShanghaiYmd().split('-');
	return { year: Number(year), month: Number(month) };
}

export function parseHHmmToMinutes(hhmm: string): number | null {
	const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm).trim());
	if (!m) return null;
	const h = Number(m[1]);
	const mm = Number(m[2]);
	if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
	if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
	return h * 60 + mm;
}

/** Schedule -> the startAtIso stored in task_cards.payload_json */
export function toTaskStartIso(input: ScheduleTimeInput): string {
	return `${input.year}-${pad2(input.month)}-${pad2(input.day)}T${input.startAt}:00`;
}

export function assertEndAfterStart(startAt: string, endAt: string): void {
	const s = parseHHmmToMinutes(startAt);
	const e = parseHHmmToMinutes(endAt);
	if (s == null || e == null) {
		throw new AppError(400, 'INVALID_TIME', '开始或结束时间格式不正确');
	}
	if (e <= s) {
		throw new AppError(400, 'INVALID_TIME_RANGE', '结束时间必须晚于开始时间');
	}
}

export function assertScheduleStartNotPast(input: ScheduleTimeInput): void {
	const [h, m] = input.startAt.split(':').map((x) => Number(x));
	if (!Number.isFinite(h) || !Number.isFinite(m)) {
		throw new AppError(400, 'INVALID_TIME', '开始时间格式不正确');
	}
	const now = getShanghaiNow();
	const targetDate = formatYmd(input.year, input.month, input.day);
	if (targetDate > now.date) return;
	if (targetDate < now.date || h! * 60 + m! < now.minutes) {
		throw new AppError(400, 'SCHEDULE_START_IN_PAST', '还在缅怀过去吗，混蛋！');
	}
}
