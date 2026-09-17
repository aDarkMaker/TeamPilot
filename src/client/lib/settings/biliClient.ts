import { httpJson } from '@/lib/httpJson';

export type BiliStatus = {
	allowed: boolean;
	bound: boolean;
	avatar?: string | null;
	nickname?: string | null;
};

export type BiliQrcode = { qrcodeKey: string; qrDataUrl: string };

export type BiliQrcodeStatus = {
	code: number;
	refreshToken: string | null;
	cookies: string | null;
	biliUid: string | null;
};

export type BiliUserInfo = { avatar: string; nickname: string };

/** 86038 is B站's "QR code expired" code */
export const BILI_QRCODE_EXPIRED = 86038;

export function fetchBiliStatus(): Promise<BiliStatus> {
	return httpJson<BiliStatus>('/api/bilibili/status', { fallbackMessage: '获取绑定状态失败' });
}

export function fetchBiliQrcode(): Promise<BiliQrcode> {
	return httpJson<BiliQrcode>('/api/bilibili/qrcode', { fallbackMessage: '生成二维码失败' });
}

export function fetchBiliQrcodeStatus(qrcodeKey: string): Promise<BiliQrcodeStatus> {
	return httpJson<BiliQrcodeStatus>('/api/bilibili/qrcode/status', {
		query: { qrcode_key: qrcodeKey },
		fallbackMessage: '检查扫码状态失败',
	});
}

export function bindBili(input: { refreshToken: string; biliUid: string; cookies: string }): Promise<unknown> {
	return httpJson<unknown>('/api/bilibili/bind', {
		method: 'POST',
		body: { refresh_token: input.refreshToken, bili_uid: input.biliUid, cookies: input.cookies },
		fallbackMessage: '绑定未成功，请重试',
	});
}

export function fetchBiliUserInfo(): Promise<BiliUserInfo> {
	return httpJson<BiliUserInfo>('/api/bilibili/me', { fallbackMessage: '获取B站用户信息失败' });
}
