const CST_TZ = 'Asia/Shanghai';

const cstDateTime = new Intl.DateTimeFormat('zh-CN', {
	timeZone: CST_TZ,
	dateStyle: 'medium',
	timeStyle: 'short',
});

const cstMonthDayTime = new Intl.DateTimeFormat('zh-CN', {
	timeZone: CST_TZ,
	month: 'numeric',
	day: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
});

const cstYmd = new Intl.DateTimeFormat('en-CA', {
	timeZone: CST_TZ,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

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
	return cstDateTime.format(d);
}

export function formatCstMonthDayTime(raw: string | null | undefined, fallback = ''): string {
	if (!raw) return fallback;
	const d = parseSqliteDateTimeAsUtc(raw);
	if (!d) return String(raw);
	return cstMonthDayTime.format(d);
}

/** Accepts a SQLite datetime string or Unix seconds (e.g. bilibili pub_ts) */
export function formatCstTimestamp(value: string | number | null | undefined, fallback = '未知时间'): string {
	if (value == null || value === '') return fallback;
	if (typeof value === 'number') {
		const d = new Date(value * 1000);
		return Number.isNaN(d.getTime()) ? String(value) : cstDateTime.format(d);
	}
	return formatCstDateTime(value, fallback);
}

/** Today in Asia/Shanghai as YYYY-MM-DD */
export function getShanghaiYmd(now: Date = new Date()): string {
	return cstYmd.format(now);
}
