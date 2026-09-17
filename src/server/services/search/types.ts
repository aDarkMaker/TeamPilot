export type SearchResultType = 'user' | 'task' | 'newcomer' | 'application' | 'schedule';

export type SearchResultItem = {
	id: string;
	type: SearchResultType;
	title: string;
	subtitle: string;
	url: string;
	matchField: string;
	matchText: string;
};

/** `rawQ` is what the user typed; `q` is the normalised (lowercased) form used for matching */
export type SearchContext = {
	rawQ: string;
	q: string;
};

export function highlightUrl(path: string, rawQ: string): string {
	return `${path}?highlight=${encodeURIComponent(rawQ)}`;
}
