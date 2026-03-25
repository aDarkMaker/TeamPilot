export function assetUrl(imported: string | { src: string } | undefined | null): string {
	if (imported == null) return '';
	return typeof imported === 'string' ? imported : imported.src;
}
