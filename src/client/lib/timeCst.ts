const CST_TZ = 'Asia/Shanghai';

function normalizeUtcLike(raw: string): string {
	const s = String(raw ?? '').trim();
	if (!s) return s;

	if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
		return s.replace(' ', 'T') + 'Z';
	}

	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
		return s + 'Z';
	}

	return s;
}

export function parseSqliteDateTimeAsUtc(raw: string): Date | null {
	const s = normalizeUtcLike(raw);
	if (!s) return null;
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? null : d;
}

export function formatCstDateTime(raw: string | null | undefined, fallback = '未知时间'): string {
	if (!raw) return fallback;
	const d = parseSqliteDateTimeAsUtc(raw);
	if (!d) return String(raw);
	return new Intl.DateTimeFormat('zh-CN', {
		timeZone: CST_TZ,
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(d);
}

export function formatCstMonthDayTime(raw: string | null | undefined, fallback = ''): string {
	if (!raw) return fallback;
	const d = parseSqliteDateTimeAsUtc(raw);
	if (!d) return String(raw);
	return new Intl.DateTimeFormat('zh-CN', {
		timeZone: CST_TZ,
		month: 'numeric',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(d);
}

