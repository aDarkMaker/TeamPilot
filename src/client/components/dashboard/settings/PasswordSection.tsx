import { useState } from 'react';

import { changePassword } from '@/lib/settings/profileClient';
import { validatePasswordChange } from '@/lib/passwordPolicy';
import { SettingsButton, SettingsInput } from '@/components/ui/settingsControls';

type Props = {
	saving: boolean;
	setSaving: (value: boolean) => void;
	onNotice: (notice: { type: 'ok' | 'err'; text: string }) => void;
};

export function PasswordSection({ saving, setSaving, onNotice }: Props) {
	const [oldPassword, setOldPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	const submit = async () => {
		const error = validatePasswordChange({ oldPassword, newPassword, confirmPassword });
		if (error) {
			onNotice({ type: 'err', text: error });
			return;
		}

		setSaving(true);
		try {
			await changePassword(oldPassword, newPassword);
			onNotice({ type: 'ok', text: '密码修改好哩！' });
			setOldPassword('');
			setNewPassword('');
			setConfirmPassword('');
		} catch (e) {
			onNotice({ type: 'err', text: e instanceof Error ? e.message : '等会再试试吧！' });
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<h2>修改密码</h2>

			<div className="settings-field">
				<label htmlFor="old-pw">当前密码</label>
				<SettingsInput
					id="old-pw"
					type="password"
					value={oldPassword}
					onChange={(e) => setOldPassword(e.target.value)}
					autoComplete="current-password"
				/>
			</div>

			<div className="settings-field">
				<label htmlFor="new-pw">新密码</label>
				<SettingsInput
					id="new-pw"
					type="password"
					value={newPassword}
					onChange={(e) => setNewPassword(e.target.value)}
					autoComplete="new-password"
				/>
			</div>

			<div className="settings-field">
				<label htmlFor="new-pw2">确认新密码</label>
				<SettingsInput
					id="new-pw2"
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					autoComplete="new-password"
				/>
			</div>

			<div className="settings-actions">
				<SettingsButton variant="secondary" disabled={saving} onClick={() => void submit()}>
					更新密码
				</SettingsButton>
			</div>
		</>
	);
}
