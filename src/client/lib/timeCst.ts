const CST_TZ = 'Asia/Shanghai';

export function parseSqliteDateTimeAsUtc(raw: string): Date | null {
	const s = String(raw ?? '').trim();
	if (!s) return null;
	if (s.includes('T')) {
		const d = new Date(s);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	const d = new Date(s.replace(' ', 'T') + 'Z');
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

