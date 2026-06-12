export function isTrustedBiliCdnUrl(url: string): boolean {
	try {
		const u = new URL(url.startsWith('//') ? `https:${url}` : url);
		if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
		const host = u.hostname.toLowerCase();
		return host === 'hdslb.com' || host.endsWith('.hdslb.com') || host === 'bilibili.com' || host.endsWith('.bilibili.com');
	} catch {
		return false;
	}
}

export function toBiliProxyImagePath(raw: string | null | undefined): string {
	if (!raw || typeof raw !== 'string') return '';
	const t = raw.trim();
	if (!t) return '';
	if (t.startsWith('/api/home/bili-proxy-image')) return t;
	const urlStr = t.startsWith('//') ? `https:${t}` : t;
	if (!isTrustedBiliCdnUrl(urlStr)) return t;
	try {
		const u = new URL(urlStr);
		return `/api/home/bili-proxy-image?url=${encodeURIComponent(u.toString())}`;
	} catch {
		return t;
	}
}
