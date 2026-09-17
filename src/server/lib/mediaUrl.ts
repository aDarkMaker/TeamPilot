/** Stored path -> public webp thumbnail URL (the webpFallback middleware serves it) */
export function toPublicWebpUrl(storedPath: string | null | undefined): string | null {
	if (!storedPath) return null;
	const normalized = String(storedPath).replace(/^\/+/, '');
	const dot = normalized.lastIndexOf('.');
	const base = dot >= 0 ? normalized.slice(0, dot) : normalized;
	return `/uploads/${base}.webp`;
}
