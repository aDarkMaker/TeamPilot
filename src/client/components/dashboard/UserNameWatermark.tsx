import { useEffect, useMemo, useState } from 'react';
import { fetchUsersMeDeduped, getCachedMe } from '../../lib/api/fetchUsersMeDeduped';

type MeResponse = {
	username: string;
	nickname: string | null;
};

function readMe(value: unknown): MeResponse | null {
	const json = value as { ok?: boolean; data?: MeResponse } | undefined;
	return json?.ok && json.data ? json.data : null;
}

function escapeXml(value: string): string {
	return value.replace(/[<>&'"]/g, (char) => {
		switch (char) {
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '&':
				return '&amp;';
			case "'":
				return '&apos;';
			default:
				return '&quot;';
		}
	});
}

function formatToday(): string {
	const now = new Date();
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// A single tile of the repeating watermark, encoded as an inline SVG so the
// overlay carries no image request and cannot be read by a screen reader.
function buildTile(label: string): string {
	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg" width="280" height="170" viewBox="0 0 280 170">' +
		'<g transform="rotate(-20 140 85)">' +
		'<text x="140" y="90" text-anchor="middle" font-family="Inter, MiSans, sans-serif" ' +
		`font-size="13" letter-spacing="0.6" fill="#3a2418">${escapeXml(label)}</text>` +
		'</g></svg>';
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function UserNameWatermark() {
	const [me, setMe] = useState<MeResponse | null>(() => readMe(getCachedMe()));
	const [today, setToday] = useState(formatToday);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			try {
				const { res, json } = await fetchUsersMeDeduped();
				if (cancelled) return;
				setMe(res.ok ? readMe(json) : null);
			} catch {
				// ignore
			}
		};

		void load();

		const onUpdated = (e: Event) => {
			const detail = (e as CustomEvent<Partial<MeResponse>>).detail;
			if (!detail) return;
			setMe((prev) => (prev ? { ...prev, ...detail } : prev));
		};

		window.addEventListener('hxk:profile-updated', onUpdated);

		// Keep the date stamp current across a long-lived session.
		const timer = window.setInterval(() => setToday(formatToday()), 60_000);

		return () => {
			cancelled = true;
			window.removeEventListener('hxk:profile-updated', onUpdated);
			window.clearInterval(timer);
		};
	}, []);

	const label = useMemo(() => {
		const name = me?.nickname?.trim() || me?.username || '';
		return name ? `${name} · ${today}` : '';
	}, [me, today]);

	if (!label) return null;

	return <div className="dash-watermark" aria-hidden="true" style={{ backgroundImage: buildTile(label), backgroundSize: '280px 170px' }} />;
}
