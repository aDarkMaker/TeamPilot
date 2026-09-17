/**
 * Group by keyOf and keep only the entry with the largest timeOf (string compare).
 * Used where a single source fans out to many rows and only the newest should show.
 */
export function dedupeLatestBy<T>(items: T[], keyOf: (item: T) => string, timeOf: (item: T) => string): T[] {
	const map = new Map<string, T>();
	for (const item of items) {
		const key = keyOf(item);
		const prev = map.get(key);
		if (!prev || timeOf(item) > timeOf(prev)) map.set(key, item);
	}
	return [...map.values()];
}
