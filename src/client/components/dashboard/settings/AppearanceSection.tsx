import UserAvatar from '@/components/common/UserAvatar';
import bgDefault from '@/assets/img/image/bg-dashboard.webp';
import { assetUrl } from '@/lib/assetUrl';
import { SettingsButton, SettingsFileInput } from '@/components/ui/settingsControls';

type Props = {
	username: string;
	avatarUrl: string | null;
	backgroundUrl: string | null;
	saving: boolean;
	onUploadAvatar: (file: File | null) => void;
	onResetAvatar: () => void;
	onUploadBackground: (file: File | null) => void;
	onResetBackground: () => void;
};

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

export function AppearanceSection({
	username,
	avatarUrl,
	backgroundUrl,
	saving,
	onUploadAvatar,
	onResetAvatar,
	onUploadBackground,
	onResetBackground,
}: Props) {
	return (
		<section className="settings-section">
			<h2>个性化设置</h2>

			<div className="settings-appearance">
				<div className="settings-appearance-block">
					<div className="settings-appearance-label">头像</div>
					<div className="settings-avatar-row">
						<UserAvatar username={username} avatarUrl={avatarUrl} size={72} />
						<div className="settings-actions-inline">
							<SettingsFileInput accept={IMAGE_ACCEPT} disabled={saving} label="上传" onPick={onUploadAvatar} />
							<SettingsButton variant="secondary" disabled={saving} onClick={onResetAvatar}>
								恢复默认
							</SettingsButton>
						</div>
					</div>
				</div>

				<div className="settings-appearance-block">
					<div className="settings-appearance-label">背景</div>
					<div className="settings-bg-preview">
						<img className="settings-bg-img" src={backgroundUrl ?? assetUrl(bgDefault)} alt="" loading="lazy" />
						<div className="settings-bg-overlay">
							<SettingsFileInput
								accept={IMAGE_ACCEPT}
								disabled={saving}
								label="修改"
								variant="overlay"
								onPick={onUploadBackground}
							/>
							<button
								type="button"
								className="settings-bg-overlay-btn secondary"
								disabled={saving}
								onClick={onResetBackground}
							>
								恢复默认
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
