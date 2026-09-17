import { useCallback, useEffect, useState } from 'react';

import {
	resetAvatar,
	resetProfileBackground,
	uploadAvatar,
	uploadProfileBackground,
	type MeProfile,
} from '@/lib/settings/profileClient';
import { useSettingsProfile, type SettingsNotice } from '@/lib/settings/useSettingsProfile';
import { DashboardToast, useDashboardToast } from '@/components/dashboard/shell/DashboardToast';
import { ProfileSection } from './ProfileSection';
import { AppearanceSection } from './AppearanceSection';
import { BiliSection } from './BiliSection';
import { PasswordSection } from './PasswordSection';
import { BirthdaySection } from './BirthdaySection';

export default function SettingsPage() {
	const toast = useDashboardToast();
	const settings = useSettingsProfile();
	const { loading, saving, notice, setNotice, profile, draft, patchDraft, avatarUrl, backgroundUrl, save, applyProfile } = settings;
	const [passwordSaving, setPasswordSaving] = useState(false);

	const busy = saving || passwordSaving;

	useEffect(() => {
		if (!notice) return;
		toast.show({ text: notice.text, type: notice.type, durationMs: 3000 });
		setNotice(null);
	}, [notice, toast, setNotice]);

	const runImageAction = useCallback(
		async (action: () => Promise<MeProfile>, successText: string, fallbackText: string) => {
			try {
				applyProfile(await action(), { bustImages: true });
				setNotice({ type: 'ok', text: successText });
			} catch (e) {
				setNotice({ type: 'err', text: e instanceof Error ? e.message : fallbackText });
			}
		},
		[applyProfile, setNotice]
	);

	const onNotice = useCallback(
		(next: SettingsNotice) => {
			if (!next.text) return;
			setNotice(next);
		},
		[setNotice]
	);

	if (loading) {
		return <div className="tc-empty settings-page">加载中……</div>;
	}

	return (
		<div className="tc-page settings-page">
			<DashboardToast toast={toast.toast} />
			<div className="tc-page-head">
				<div className="tc-page-head__text">
					<span className="tc-eyebrow">账号</span>
					<h1 className="tc-page-title">个性设置</h1>
				</div>
			</div>

			<div className="settings-card">
				<div className="settings-stack">
					<ProfileSection
						username={profile?.username ?? ''}
						draft={draft}
						saving={busy}
						onPatch={patchDraft}
						onSave={() => void save()}
					/>
					<section className="settings-section">
						<PasswordSection saving={passwordSaving} setSaving={setPasswordSaving} onNotice={onNotice} />
					</section>
				</div>

				<div className="settings-stack">
					<AppearanceSection
						username={profile?.username ?? ''}
						avatarUrl={avatarUrl}
						backgroundUrl={backgroundUrl}
						saving={busy}
						onUploadAvatar={(file) => {
							if (file) void runImageAction(() => uploadAvatar(file), '头像修改好哩！', '等会再试试吧！');
						}}
						onResetAvatar={() => void runImageAction(() => resetAvatar(), '头像恢复默认好哩！', '等会再试试吧！')}
						onUploadBackground={(file) => {
							if (file) void runImageAction(() => uploadProfileBackground(file), '背景图片上传好啦！', '等会再试试吧！');
						}}
						onResetBackground={() => void runImageAction(() => resetProfileBackground(), '背景恢复默认好哩！', '等会再试试吧！')}
					/>
					<section className="settings-section">
						<BirthdaySection
							birthdayMonth={draft.birthdayMonth}
							birthdayDay={draft.birthdayDay}
							saving={busy}
							onPatch={patchDraft}
							onSave={() => void save()}
						/>
					</section>
				</div>

				<BiliSection onNotice={onNotice} />
			</div>
		</div>
	);
}
