import { pinyin } from 'pinyin-pro';

/** Mirrors SearchService.normalizeKey so list filtering behaves like the global search. */
export function normalizeSearchKey(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, '');
}

type PinyinTokens = { full: string; initials: string };

/** Mirrors SearchService.pinyinTokens: full pinyin plus first-letter initials. */
function buildPinyinTokens(raw: string): PinyinTokens {
	const normalized = normalizeSearchKey(raw);
	if (!normalized) return { full: '', initials: '' };
	const full = normalizeSearchKey(
		pinyin(normalized, {
			toneType: 'none',
			type: 'string',
			separator: '',
			nonZh: 'removed',
		})
	);
	const initials = normalizeSearchKey(
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

const tokensCache = new Map<string, PinyinTokens>();

function tokensFor(name: string): PinyinTokens {
	const hit = tokensCache.get(name);
	if (hit) return hit;
	const tokens = buildPinyinTokens(name);
	tokensCache.set(name, tokens);
	return tokens;
}

/** Raw text, full pinyin and initials, matching how the global search resolves a person. */
export function matchesName(name: string, query: string): boolean {
	const q = normalizeSearchKey(query);
	if (!q) return true;
	if (normalizeSearchKey(name).includes(q)) return true;
	const { full, initials } = tokensFor(name);
	return (full.length > 0 && full.includes(q)) || (initials.length > 0 && initials.includes(q));
}
