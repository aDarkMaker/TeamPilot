import { fetchUsersMeDeduped } from '@/lib/api/fetchUsersMeDeduped';
import { httpJson, httpJsonVoid } from '@/lib/httpJson';

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
};

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

export async function fetchMeRole(): Promise<MeRole | null> {
	const { res, json } = await fetchUsersMeDeduped();
	const envelope = json as { ok?: boolean; data?: { role: MeRole } };
	if (!res.ok || !envelope.ok || !envelope.data) return null;
	return envelope.data.role;
}

export async function fetchAnnouncements(limit = 3): Promise<Announcement[]> {
	const data = await httpJson<Announcement[]>('/api/home/announcements', {
		query: { limit },
		fallbackMessage: '公告加载失败了',
	});
	return data ?? [];
}

export function createAnnouncement(input: { title: string; contentMarkdown: string; isPinned?: boolean }): Promise<Announcement> {
	return httpJson<Announcement>('/api/home/announcements', {
		method: 'POST',
		body: input,
		fallbackMessage: '发布公告失败了',
	});
}

export function setAnnouncementPinned(id: string, isPinned: boolean): Promise<void> {
	return httpJsonVoid(`/api/home/announcements/${encodeURIComponent(id)}/pin`, {
		method: 'PATCH',
		body: { isPinned },
		fallbackMessage: '置顶操作失败了',
	});
}

export function deleteAnnouncement(id: string): Promise<void> {
	return httpJsonVoid(`/api/home/announcements/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		fallbackMessage: '删除公告失败了',
	});
}

export async function fetchBiliDynamics(): Promise<BiliDynamic[]> {
	const data = await httpJson<{ uid: string; items: BiliDynamic[]; fetchedAt: number }>('/api/home/bili-dynamics', {
		fallbackMessage: '动态加载失败了',
	});
	return data.items ?? [];
}

export function fetchTodayBirthdays(): Promise<TodayBirthdaysPayload> {
	return httpJson<TodayBirthdaysPayload>('/api/home/birthdays/today', { fallbackMessage: '今日寿星加载失败了' });
}

export function fetchBirthdayWishes(recipientUserId: string) {
	return httpJson<{ recipientUserId: string; wishDate: string; items: BirthdayWish[] }>('/api/home/birthdays/wishes', {
		query: { recipientUserId },
		fallbackMessage: '祝福列表加载失败了',
	});
}

export function postBirthdayWish(input: { recipientUserId: string; message: string }): Promise<BirthdayWish> {
	return httpJson<BirthdayWish>('/api/home/birthdays/wishes', {
		method: 'POST',
		body: input,
		fallbackMessage: '发送祝福失败了',
	});
}
