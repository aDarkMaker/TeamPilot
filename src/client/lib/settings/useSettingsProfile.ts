import { useCallback, useEffect, useRef, useState } from 'react';

import { broadcastProfileUpdated } from '@/lib/events';
import { fetchMe, saveProfile, withBust, type MeProfile, type ProfileDraft } from './profileClient';

const AUTOSAVE_DELAY_MS = 800;

const EMPTY_DRAFT: ProfileDraft = { nickname: '', signature: '', qq: '', birthdayMonth: '', birthdayDay: '' };

function toDraft(profile: MeProfile): ProfileDraft {
	return {
		nickname: profile.nickname ?? '',
		signature: profile.signature ?? '',
		qq: profile.qq ?? '',
		birthdayMonth: profile.birthdayMonth ?? '',
		birthdayDay: profile.birthdayDay ?? '',
	};
}

function isSameDraft(a: ProfileDraft, b: ProfileDraft): boolean {
	return a.nickname === b.nickname && a.signature === b.signature && a.qq === b.qq && a.birthdayMonth === b.birthdayMonth && a.birthdayDay === b.birthdayDay;
}

export type SettingsNotice = { type: 'ok' | 'err'; text: string };

/**
 * Owns the loaded profile, the editable draft, the debounced autosave and the
 * avatar / background URLs. Sections only read and patch the draft.
 */
export function useSettingsProfile() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [notice, setNotice] = useState<SettingsNotice | null>(null);
	const [profile, setProfile] = useState<MeProfile | null>(null);
	const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

	/** Last persisted draft; guards against autosaving an unchanged form */
	const savedRef = useRef<ProfileDraft>(EMPTY_DRAFT);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const applyProfile = useCallback((next: MeProfile, options: { bustImages?: boolean; broadcast?: boolean } = {}) => {
		setProfile(next);
		setAvatarUrl(options.bustImages ? withBust(next.avatarUrl) : next.avatarUrl);
		setBackgroundUrl(options.bustImages ? withBust(next.profileBackgroundUrl) : next.profileBackgroundUrl);
		setDraft(toDraft(next));
		savedRef.current = toDraft(next);
		if (options.broadcast !== false) {
			broadcastProfileUpdated({
				nickname: next.nickname,
				signature: next.signature,
				qq: next.qq,
				avatarUrl: next.avatarUrl,
				profileBackgroundUrl: next.profileBackgroundUrl,
			});
		}
	}, []);

	const load = useCallback(async () => {
		setNotice(null);
		try {
			applyProfile(await fetchMe(), { broadcast: false });
		} catch {
			setNotice({ type: 'err', text: '等会再试试吧！' });
		} finally {
			setLoading(false);
		}
	}, [applyProfile]);

	useEffect(() => {
		void load();
	}, [load]);

	const patchDraft = useCallback((patch: Partial<ProfileDraft>) => {
		setDraft((prev) => ({ ...prev, ...patch }));
	}, []);

	/** Persists the draft immediately; used by the explicit save buttons */
	const save = useCallback(async () => {
		setSaving(true);
		setNotice(null);
		try {
			applyProfile(await saveProfile(draft));
			setNotice({ type: 'ok', text: '保存好哩！' });
			return true;
		} catch (e) {
			setNotice({ type: 'err', text: e instanceof Error ? e.message : '网络开小差了，等会再试～' });
			return false;
		} finally {
			setSaving(false);
		}
	}, [draft, applyProfile]);

	// Debounced autosave. Every field in the draft is a dependency, so edits to
	// the birthday pickers are persisted too instead of being silently dropped.
	useEffect(() => {
		if (loading) return;
		if (isSameDraft(draft, savedRef.current)) return;

		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			void (async () => {
				if (isSameDraft(draft, savedRef.current)) return;
				try {
					applyProfile(await saveProfile(draft));
					setNotice({ type: 'ok', text: '已自动保存' });
				} catch {
					setNotice({ type: 'err', text: '自动保存失败' });
				}
			})();
		}, AUTOSAVE_DELAY_MS);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [draft, loading, applyProfile]);

	return {
		loading,
		saving,
		notice,
		setNotice,
		profile,
		draft,
		patchDraft,
		avatarUrl,
		backgroundUrl,
		save,
		applyProfile,
		reload: load,
	};
}
