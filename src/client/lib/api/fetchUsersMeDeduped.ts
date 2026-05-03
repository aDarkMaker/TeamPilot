let inflight: Promise<{ res: Response; json: unknown }> | null = null;

export async function fetchUsersMeDeduped(): Promise<{ res: Response; json: unknown }> {
	if (!inflight) {
		inflight = (async () => {
			const res = await fetch('/api/users/me', { credentials: 'include' });
			const json = await res.json().catch(() => ({}));
			return { res, json };
		})().finally(() => {
			inflight = null;
		});
	}
	return inflight;
}
