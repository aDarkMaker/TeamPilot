import { useCallback, useEffect, useRef, useState } from 'react';

import {
	createAnnouncement as createAnnouncementRequest,
	deleteAnnouncement as deleteAnnouncementRequest,
	fetchAnnouncements,
	fetchBiliDynamics,
	fetchBirthdayWishes,
	fetchMeRole,
	fetchTodayBirthdays,
	postBirthdayWish,
	setAnnouncementPinned,
	type Announcement,
	type BiliDynamic,
	type BirthdayWish,
	type MeRole,
	type TodayBirthdayUser,
} from './homeClient';

export type HomeError = { text: string; seq: number };

const toMessage = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/**
 * Owns every HomePage data source plus the mutations on top of them, so the
 * announcement list, the birthday card and the dynamics card stay presentational.
 */
export function useHomeData() {
	const [role, setRole] = useState<MeRole | null>(null);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [dynamics, setDynamics] = useState<BiliDynamic[]>([]);
	const [birthdayUsers, setBirthdayUsers] = useState<TodayBirthdayUser[]>([]);
	const [wishMap, setWishMap] = useState<Record<string, BirthdayWish[]>>({});
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<HomeError | null>(null);

	const aliveRef = useRef(true);
	useEffect(() => {
		aliveRef.current = true;
		return () => {
			aliveRef.current = false;
		};
	}, []);

	const load = useCallback(async (options: { initial?: boolean } = {}) => {
		if (options.initial) {
			setLoading(true);
			setError(null);
		}

		const [roleResult, annResult, dynResult, birthdayResult] = await Promise.allSettled([
			fetchMeRole(),
			fetchAnnouncements(3),
			fetchBiliDynamics(),
			fetchTodayBirthdays(),
		]);
		if (!aliveRef.current) return;

		if (roleResult.status === 'fulfilled') setRole(roleResult.value);
		if (annResult.status === 'fulfilled') setAnnouncements(annResult.value);
		if (dynResult.status === 'fulfilled') setDynamics(dynResult.value);

		if (birthdayResult.status === 'fulfilled') {
			const users = birthdayResult.value.users;
			setBirthdayUsers(users);
			if (users.length === 0) {
				setWishMap({});
			} else {
				const entries = await Promise.all(
					users.map(async (u) => {
						try {
							const rows = await fetchBirthdayWishes(u.id);
							return [u.id, rows.items] as const;
						} catch {
							// A missing wish list must not blank the whole birthday card.
							return [u.id, []] as const;
						}
					})
				);
				if (!aliveRef.current) return;
				setWishMap(Object.fromEntries(entries));
			}
		}

		const failures: string[] = [];
		if (annResult.status === 'rejected') failures.push('公告');
		if (dynResult.status === 'rejected') failures.push('B站动态');
		if (birthdayResult.status === 'rejected') failures.push('生日');
		if (failures.length > 0) setError({ text: `${failures.join('、')}加载失败，稍后再试`, seq: Date.now() });

		if (options.initial) setLoading(false);
	}, []);

	useEffect(() => {
		void load({ initial: true });
	}, [load]);

	/** Runs a mutation, refreshes the page data on success and reports failures via `error` */
	const mutate = useCallback(
		async (action: () => Promise<void>, fallbackMessage: string) => {
			setBusy(true);
			setError(null);
			try {
				await action();
				await load();
				return true;
			} catch (e) {
				setError({ text: toMessage(e, fallbackMessage), seq: Date.now() });
				return false;
			} finally {
				if (aliveRef.current) setBusy(false);
			}
		},
		[load]
	);

	const createAnnouncement = useCallback(
		(input: { title: string; contentMarkdown: string }) =>
			mutate(async () => {
				await createAnnouncementRequest({ ...input, isPinned: false });
			}, '发布公告失败'),
		[mutate]
	);

	const deleteAnnouncement = useCallback(
		(id: string) => mutate(() => deleteAnnouncementRequest(id), '删除公告失败'),
		[mutate]
	);

	const toggleAnnouncementPinned = useCallback(
		(item: Announcement) => mutate(() => setAnnouncementPinned(item.id, !item.isPinned), '置顶操作失败'),
		[mutate]
	);

	const postWish = useCallback(
		async (recipientUserId: string, message: string) => {
			setBusy(true);
			setError(null);
			try {
				const created = await postBirthdayWish({ recipientUserId, message });
				if (!aliveRef.current) return true;
				setWishMap((prev) => ({ ...prev, [recipientUserId]: [...(prev[recipientUserId] ?? []), created] }));
				return true;
			} catch (e) {
				setError({ text: toMessage(e, '发送祝福失败'), seq: Date.now() });
				return false;
			} finally {
				if (aliveRef.current) setBusy(false);
			}
		},
		[]
	);

	const dismissError = useCallback(() => setError(null), []);

	const canPublish = role === 'admin' || role === 'super_admin';
	const fatalError = error !== null && announcements.length === 0 && birthdayUsers.length === 0;

	return {
		role,
		canPublish,
		announcements,
		dynamics,
		birthdayUsers,
		wishMap,
		loading,
		busy,
		error,
		fatalError,
		dismissError,
		reload: load,
		createAnnouncement,
		deleteAnnouncement,
		toggleAnnouncementPinned,
		postWish,
	};
}
