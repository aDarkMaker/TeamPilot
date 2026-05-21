let inflight: Promise<{ res: Response; json: unknown }> | null = null;
let cachedMe: unknown = undefined;

export function getCachedMe(): unknown {
	return cachedMe;
}

export function clearCachedMe(): void {
	cachedMe = undefined;
	inflight = null;
}

export async function fetchUsersMeDeduped(): Promise<{ res: Response; json: unknown }> {
	if (!inflight) {
		inflight = (async () => {
			const res = await fetch('/api/users/me', { credentials: 'include' });
			const json = await res.json().catch(() => ({}));

			if (res.ok) {
				cachedMe = json;
			} else if (res.status === 401) {
				cachedMe = undefined;
			}

			return { res, json };
		})().finally(() => {
			inflight = null;
		});
	}
	return inflight;
}
