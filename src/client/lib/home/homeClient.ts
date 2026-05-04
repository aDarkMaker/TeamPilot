import { fetchUsersMeDeduped } from '../api/fetchUsersMeDeduped';

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

export type TodayBirthdayUser = {
	id: string;
	username: string;
	nickname: string | null;
	avatarUrl: string | null;
}

export type TodayBirthdaysPayload = {
	ymd: string;
	users: TodayBirthdayUser[];
};

export type BirthdayWish = {
	id: string;
	message: string;
	createdAt: string;
	author: { id: string; username: string; nickname: string | null; avatarUrl: string | null };
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
	const { res, json: raw } = await fetchUsersMeDeduped();
	const json = raw as ApiSuccess<{ role: MeRole }> | ApiFailure;
	if (!res.ok || !json.ok || !json.data) return null;
	return json.data.role;
}

export async function fetchAnnouncements(limit = 3): Promise<Announcement[]> {
	const res = await fetch(`/api/home/announcements?limit=${encodeURIComponent(String(limit))}`, {
		credentials: 'include',
	});
	const json = await parseJson<Announcement[]>(res);
	if (!res.ok || !json.ok) throw new Error(errText(json, '公告加载失败了'));
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
	if (!res.ok || !json.ok || !json.data) throw new Error(errText(json, '发布公告失败了'));
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
	if (!res.ok || !json.ok) throw new Error(errText(json, '置顶操作失败了'));
}

export async function deleteAnnouncement(id: string): Promise<void> {
	const res = await fetch(`/api/home/announcements/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	const json = await parseJson<{ id: string }>(res);
	if (!res.ok || !json.ok) throw new Error(errText(json, '删除公告失败了'));
}

export async function fetchBiliDynamics(): Promise<BiliDynamic[]> {
	const res = await fetch('/api/home/bili-dynamics', {
		credentials: 'include',
	});
	const json = await parseJson<{ uid: string; items: BiliDynamic[]; fetchedAt: number }>(res);
	if (!res.ok || !json.ok || !json.data) throw new Error(errText(json, '动态加载失败了'));
	return json.data.items ?? [];
}

export async function fetchTodayBirthdays(): Promise<TodayBirthdaysPayload> {
	const res = await fetch('/api/home/birthdays/today', { credentials: 'include' });
	const json = await parseJson<TodayBirthdaysPayload>(res);
	if (!res.ok || !json.ok || !json.data) throw new Error(errText(json, '今日寿星加载失败了'));
	return json.data;
}

export async function fetchBirthdayWishes(recipientUserId: string) {
	const q = new URLSearchParams({ recipientUserId });
	const res = await fetch(`/api/home/birthdays/wishes?${q}`, { credentials: 'include' });
	const json = await parseJson<{ recipientUserId: string; wishDate: string; items: BirthdayWish[] }>(res);
	if (!res.ok || !json.ok || !json.data) throw new Error(errText(json, '祝福列表加载失败了'));
	return json.data;
}

export async function postBirthdayWish(input: { recipientUserId: string; message: string }): Promise<BirthdayWish> {
	const res = await fetch('/api/home/birthdays/wishes', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	});
	const json = await parseJson<BirthdayWish>(res);
	if (!res.ok || !json.ok || !json.data) throw new Error(errText(json, '发送祝福失败了'));
	return json.data;
}
