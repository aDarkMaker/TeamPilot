export type MeRole = 'user' | 'admin' | 'super_admin';

export type Announcement = {
	id: string;
	title: string;
	contentMarkdown: string;
	isPinned: boolean;
	createdBy: string;
	createdByUsername: string;
	createdAt: string;
	updatedAt: string;
};

export type BiliDynamic = {
	id: string;
	title: string;
	text: string;
	jumpUrl: string | null;
	mediaType: 'image' | 'video' | 'none';
	mediaUrl: string | null;
	videoEmbedUrl: string | null;
	pubTs: number | null;
	pubTimeText: string | null;
};

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; code: string; message: string };

async function parseJson<T>(res: Response): Promise<ApiSuccess<T> | ApiFailure> {
	return (await res.json().catch(() => ({}))) as ApiSuccess<T> | ApiFailure;
}

function errText(json: ApiSuccess<unknown> | ApiFailure, fallback: string) {
	if ('ok' in json && !json.ok && typeof json.message === 'string') return json.message;
	return fallback;
}

export async function fetchMeRole(): Promise<MeRole | null> {
	const res = await fetch('/api/users/me', { credentials: 'include' });
	const json = await parseJson<{ role: MeRole }>(res);
	if (!res.ok || !json.ok || !json.data) return null;
	return json.data.role;
}

export async function fetchAnnouncements(limit = 3): Promise<Announcement[]> {
	const res = await fetch(`/api/home/announcements?limit=${encodeURIComponent(String(limit))}`, {
		credentials: 'include',
	});
	const json = await parseJson<Announcement[]>(res);
	if (!res.ok || !json.ok) throw new Error(errText(json, 'LOAD_ANNOUNCEMENTS_FAILED'));
	return json.data ?? [];
}

export async function createAnnouncement(input: { title: string; contentMarkdown: string; isPinned?: boolean }): Promise<Announcement> {
	const res = await fetch('/api/home/announcements', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	});
	const json = await parseJson<Announcement>(res);
	if (!res.ok || !json.ok || !json.data) throw new Error(errText(json, 'CREATE_ANNOUNCEMENT_FAILED'));
	return json.data;
}

export async function setAnnouncementPinned(id: string, isPinned: boolean): Promise<void> {
	const res = await fetch(`/api/home/announcements/${encodeURIComponent(id)}/pin`, {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ isPinned }),
	});
	const json = await parseJson<{ id: string; isPinned: boolean }>(res);
	if (!res.ok || !json.ok) throw new Error(errText(json, 'PIN_ANNOUNCEMENT_FAILED'));
}

export async function deleteAnnouncement(id: string): Promise<void> {
	const res = await fetch(`/api/home/announcements/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	const json = await parseJson<{ id: string }>(res);
	if (!res.ok || !json.ok) throw new Error(errText(json, 'DELETE_ANNOUNCEMENT_FAILED'));
}

export async function fetchBiliDynamics(): Promise<BiliDynamic[]> {
	const res = await fetch('/api/home/bili-dynamics', {
		credentials: 'include',
	});
	const json = await parseJson<{ uid: string; items: BiliDynamic[]; fetchedAt: number }>(res);
	if (!res.ok || !json.ok || !json.data) throw new Error(errText(json, 'LOAD_BILI_DYNAMICS_FAILED'));
	return json.data.items ?? [];
}
