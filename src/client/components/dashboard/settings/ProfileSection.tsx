import type { ProfileDraft } from '@/lib/settings/profileClient';
import { SettingsButton, SettingsInput, SettingsTextarea } from '@/components/ui/settingsControls';

type Props = {
	username: string;
	draft: ProfileDraft;
	saving: boolean;
	onPatch: (patch: Partial<ProfileDraft>) => void;
	onSave: () => void;
};

export function ProfileSection({ username, draft, saving, onPatch, onSave }: Props) {
	return (
		<section className="settings-section">
			<h2>基本资料</h2>
			<div className="settings-username">实名：{username}</div>

			<div className="settings-field">
				<label htmlFor="set-nick">昵称：</label>
				<SettingsInput
					id="set-nick"
					value={draft.nickname}
					onChange={(e) => onPatch({ nickname: e.target.value })}
					autoComplete="nickname"
				/>
			</div>

			<div className="settings-field">
				<label htmlFor="set-sig">个性签名：</label>
				<SettingsTextarea
					id="set-sig"
					value={draft.signature}
					onChange={(e) => onPatch({ signature: e.target.value })}
					maxLength={200}
					autoComplete="off"
				/>
			</div>

			<div className="settings-field">
				<label htmlFor="set-qq">QQ：</label>
				<SettingsInput id="set-qq" value={draft.qq} onChange={(e) => onPatch({ qq: e.target.value })} autoComplete="off" />
			</div>

			<div className="settings-actions">
				<SettingsButton disabled={saving} onClick={onSave}>
					保存资料
				</SettingsButton>
			</div>
		</section>
	);
}
