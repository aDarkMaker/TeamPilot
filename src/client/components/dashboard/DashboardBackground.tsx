import { useEffect } from 'react';

import { fetchUsersMeDeduped } from '../../lib/api/fetchUsersMeDeduped';

type UpdatePayload = {
	profileBackgroundUrl?: string | null;
};

export default function DashboardBackground() {
	useEffect(() => {
		const LS_KEY = 'hxk_profile_background_url';

		const apply = (url: string | null | undefined, opts?: { persist?: boolean }) => {
			const persist = opts?.persist ?? true;
			if (persist) {
				if (url) localStorage.setItem(LS_KEY, url);
				else localStorage.removeItem(LS_KEY);
			}

			if (url) document.documentElement.style.setProperty('--dash-bg-image', `url(${url})`);
			else document.documentElement.style.removeProperty('--dash-bg-image');
		};

		const syncFromLocalStorage = () => {
			const cached = localStorage.getItem(LS_KEY);
			if (cached) apply(cached, { persist: false });
		};

		let cancelled = false;
		const load = async () => {
			try {
				const { res, json: raw } = await fetchUsersMeDeduped();
				if (cancelled) return;
				const json = raw as { ok?: boolean; data?: { profileBackgroundUrl?: string | null } };
				if (res.ok && json.ok && json.data) {
					apply(json.data.profileBackgroundUrl);
				}
			} catch {
				// ignore
			}
		};

		// 先从缓存恢复（确保切换页面不丢失）
		syncFromLocalStorage();

		// 再拉一次保证与后端一致
		void load();

		const onUpdated = (e: Event) => {
			const detail = (e as CustomEvent<UpdatePayload>).detail;
			apply(detail?.profileBackgroundUrl);
		};

		window.addEventListener('hxk:profile-updated', onUpdated);

		// 软导航可能会重置部分 inline style；每次 page-load 再同步一次缓存
		const onPage = () => syncFromLocalStorage();
		document.addEventListener('astro:page-load', onPage);

		return () => {
			cancelled = true;
			window.removeEventListener('hxk:profile-updated', onUpdated);
			document.removeEventListener('astro:page-load', onPage);
		};
	}, []);

	return null;
}

