import { pinyin } from 'pinyin-pro';

export function normalizeKey(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, '');
}

export function pinyinTokens(raw: string): { full: string; initials: string } {
	const normalized = normalizeKey(raw);
	if (!normalized) return { full: '', initials: '' };
	const full = normalizeKey(
		pinyin(normalized, {
			toneType: 'none',
			type: 'string',
			separator: '',
			nonZh: 'removed',
		})
	);
	const initials = normalizeKey(
		pinyin(normalized, {
			toneType: 'none',
			pattern: 'first',
			type: 'string',
			separator: '',
			nonZh: 'removed',
		})
	);
	return { full, initials };
}

export interface SearchableUser {
	username: string;
	nickname: string | null;
}

/** Fuzzy match on username/nickname: raw text, full pinyin and pinyin initials */
export function matchesUserByQuery(q: string, u: SearchableUser): boolean {
	const display = (u.nickname?.trim() || u.username || '').trim();
	const candidates = [
		normalizeKey(u.username ?? ''),
		normalizeKey(u.nickname ?? ''),
		normalizeKey(display),
		...Object.values(pinyinTokens(display)),
		...Object.values(pinyinTokens(u.username ?? '')),
		...Object.values(pinyinTokens(u.nickname ?? '')),
	];
	return candidates.some((c) => c.length > 0 && c.includes(q));
}
