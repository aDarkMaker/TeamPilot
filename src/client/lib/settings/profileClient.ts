import { ApiError, httpJson, httpJsonVoid, httpMultipart } from '@/lib/httpJson';

export type MeProfile = {
	id: string;
	username: string;
	nickname: string | null;
	signature: string | null;
	qq: string | null;
	birthdayMonth: number | null;
	birthdayDay: number | null;
	avatarUrl: string | null;
	profileBackgroundUrl: string | null;
	role: string;
};

/** Editable subset of the profile; empty strings mean "not set" */
export type ProfileDraft = {
	nickname: string;
	signature: string;
	qq: string;
	birthdayMonth: number | '';
	birthdayDay: number | '';
};

export function toProfileBody(draft: ProfileDraft) {
	return {
		nickname: draft.nickname.trim() || null,
		signature: draft.signature.trim() || null,
		qq: draft.qq.trim() || null,
		birthdayMonth: draft.birthdayMonth === '' ? null : draft.birthdayMonth,
		birthdayDay: draft.birthdayDay === '' ? null : draft.birthdayDay,
	};
}

/** Cache-busts an uploaded image so the browser drops its cached copy */
function withBust(url: string | null | undefined): string | null {
	return url ? `${url}?t=${Date.now()}` : null;
}

export function fetchMe(): Promise<MeProfile> {
	return httpJson<MeProfile>('/api/users/me', { fallbackMessage: '加载失败了！' });
}

export function saveProfile(draft: ProfileDraft): Promise<MeProfile> {
	return httpJson<MeProfile>('/api/users/me', { method: 'PATCH', body: toProfileBody(draft), fallbackMessage: '保存失败了！' });
}

export async function uploadAvatar(file: File): Promise<MeProfile> {
	const form = new FormData();
	form.append('file', file);
	return httpMultipart<MeProfile>('/api/users/me/avatar', form, '头像上传失败了！');
}

export async function uploadProfileBackground(file: File): Promise<MeProfile> {
	const form = new FormData();
	form.append('bg', file);
	return httpMultipart<MeProfile>('/api/users/me/profile-background', form, '背景图片上传失败了！');
}

export function resetAvatar(): Promise<MeProfile> {
	return httpJson<MeProfile>('/api/users/me/avatar/reset', { method: 'POST', fallbackMessage: '头像恢复默认失败了！' });
}

export function resetProfileBackground(): Promise<MeProfile> {
	return httpJson<MeProfile>('/api/users/me/profile-background/reset', { method: 'POST', fallbackMessage: '背景恢复默认失败了！' });
}

export function changePassword(oldPassword: string, newPassword: string): Promise<void> {
	return httpJsonVoid('/api/users/me/password', { method: 'POST', body: { oldPassword, newPassword }, fallbackMessage: '修改密码失败了！' });
}

export { ApiError, withBust };
