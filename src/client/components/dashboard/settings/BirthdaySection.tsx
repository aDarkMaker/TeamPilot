import { useState } from 'react';

import { PickerDialog } from '@/components/common/PickerDialog';
import { SettingsButton } from '@/components/ui/settingsControls';
import type { ProfileDraft } from '@/lib/settings/profileClient';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

type Props = {
	birthdayMonth: ProfileDraft['birthdayMonth'];
	birthdayDay: ProfileDraft['birthdayDay'];
	saving: boolean;
	onPatch: (patch: Partial<ProfileDraft>) => void;
	onSave: () => void;
};

export function BirthdaySection({ birthdayMonth, birthdayDay, saving, onPatch, onSave }: Props) {
	const [picker, setPicker] = useState<'month' | 'day' | null>(null);

	const options = picker === 'month' ? MONTHS : DAYS;
	const selected = picker === 'month' ? birthdayMonth : birthdayDay;

	return (
		<>
			<h2>我的生日</h2>
			<div className="settings-field">
				<div className="settings-birthday-row">
					<button
						type="button"
						className="dash-btn settings-birthday-pick"
						disabled={saving}
						onClick={() => setPicker('month')}
					>
						{birthdayMonth === '' ? '月' : `${birthdayMonth} 月`}
					</button>
					<button type="button" className="dash-btn settings-birthday-pick" disabled={saving} onClick={() => setPicker('day')}>
						{birthdayDay === '' ? '日' : `${birthdayDay} 日`}
					</button>
					<SettingsButton variant="secondary" disabled={saving} onClick={() => onPatch({ birthdayMonth: '', birthdayDay: '' })}>
						清空
					</SettingsButton>
				</div>
			</div>

			<div className="settings-actions">
				<SettingsButton disabled={saving} onClick={onSave}>
					保存生日
				</SettingsButton>
			</div>

			<PickerDialog
				open={picker !== null}
				stateClass="open"
				title={picker === 'month' ? '选择月份' : '选择日期'}
				onClose={() => setPicker(null)}
			>
				{options.map((v) => (
					<button
						key={v}
						type="button"
						className={`time-picker-item ${selected === v ? 'active' : ''}`}
						onClick={() => {
							if (picker === 'month') onPatch({ birthdayMonth: v });
							else onPatch({ birthdayDay: v });
							setPicker(null);
						}}
					>
						{picker === 'month' ? `${v} 月` : `${v} 日`}
					</button>
				))}
			</PickerDialog>
		</>
	);
}
