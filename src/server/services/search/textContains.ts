/** Case-insensitive substring test that tolerates null columns */
export function textContains(text: string | null | undefined, keyword: string): boolean {
	if (!text) return false;
	return text.toLowerCase().includes(keyword.toLowerCase());
}
