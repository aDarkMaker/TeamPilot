import type { Database } from 'bun:sqlite';
import type { AppConfig } from '../config';
import { AppError } from '../types/api';
import { toBiliProxyImagePath } from '../lib/biliCdnImage';
import QRCode from 'qrcode';

interface QrcodeResult {
	qrcodeKey: string;
	qrDataUrl: string;
}

interface QrcodeStatus {
	code: number;
	refreshToken: string | null;
	cookies: string | null;
	biliUid: string | null;
}

export class BilibiliService {
	constructor(
		private sqlite: Database,
		private cfg: AppConfig
	) {}

	private getUserCookie(userId: string): string | null {
		const row = this.sqlite.query(`SELECT bili_cookie FROM users WHERE id = ?`).all(Number(userId)) as any[];
		return row?.[0]?.bili_cookie ?? null;
	}

	async generateQrcode(): Promise<QrcodeResult> {
		const res = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', {
			headers: {
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			},
			signal: AbortSignal.timeout(10000),
		});

		if (!res.ok) throw new AppError(502, 'BILI_QRCODE_FAILED', 'B站二维码生成失败');

		const json = (await res.json()) as any;
		if (json.code !== 0 || !json.data) {
			throw new AppError(502, 'BILI_QRCODE_FAILED', 'B站二维码生成失败');
		}

		const qrDataUrl = await QRCode.toDataURL(json.data.url, {
			width: 256,
			margin: 2,
			color: { dark: '#000', light: '#fff' },
		});

		return {
			qrcodeKey: json.data.qrcode_key,
			qrDataUrl,
		};
	}

	async pollQrcode(qrcodeKey: string): Promise<QrcodeStatus> {
		const res = await fetch(`https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${encodeURIComponent(qrcodeKey)}`, {
			headers: {
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			},
			signal: AbortSignal.timeout(10000),
		});

		if (!res.ok) return { code: -1, refreshToken: null, cookies: null, biliUid: null };

		const json = (await res.json()) as any;
		const code = json?.data?.code ?? json?.code ?? -1;

		if (code === 0 && json.data) {
			const refreshToken = json.data.refresh_token ?? null;
			const cookies = this.buildCookieString(json.data, res.headers);
			const biliUid = json.data.DedeUserID ?? null;
			return { code, refreshToken, cookies, biliUid };
		}

		return { code, refreshToken: null, cookies: null, biliUid: null };
	}

	private buildCookieString(data: any, headers: Headers): string {
		const setCookie = headers.get('set-cookie');
		const parts: string[] = [];

		if (data.DedeUserID) parts.push(`DedeUserID=${data.DedeUserID}`);
		if (data.DedeUserID__ckMd5) parts.push(`DedeUserID__ckMd5=${data.DedeUserID__ckMd5}`);
		if (data.SESSDATA) parts.push(`SESSDATA=${data.SESSDATA}`);
		if (data.bili_jct) parts.push(`bili_jct=${data.bili_jct}`);

		if (setCookie) {
			const extra = setCookie
				.split(',')
				.map((s) => s.trim().split(';')[0])
				.filter((s): s is string => Boolean(s));
			for (const e of extra) {
				const key = e.split('=')[0];
				if (key && !parts.some((p) => p.startsWith(key + '='))) {
					parts.push(e);
				}
			}
		}

		return parts.join('; ');
	}

	async fetchBiliUserInfo(userId: string): Promise<{ avatar: string; nickname: string }> {
		const cookie = this.getUserCookie(userId);
		if (!cookie?.trim()) throw new AppError(400, 'BILI_NOT_BOUND', '尚未绑定B站账号');

		const res = await fetch('https://api.bilibili.com/x/space/myinfo', {
			headers: {
				cookie,
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				referer: 'https://space.bilibili.com/',
			},
			signal: AbortSignal.timeout(10000),
		});

		if (!res.ok) throw new AppError(502, 'BILI_INFO_FAILED', '获取B站用户信息失败');

		const json = (await res.json()) as any;
		if (json.code !== 0 || !json.data) {
			throw new AppError(502, 'BILI_INFO_FAILED', '获取B站用户信息失败');
		}

		return {
			avatar: toBiliProxyImagePath(json.data.face),
			nickname: json.data.name ?? '',
		};
	}

	saveBind(userId: string, refreshToken: string, biliUid: string, cookies: string): void {
		this.sqlite.run(`UPDATE users SET bilibili_refresh_token = ?, bili_uid = ?, bili_cookie = ? WHERE id = ?`, [
			refreshToken,
			biliUid,
			cookies,
			Number(userId),
		]);
	}

	async getDynamicCookie(): Promise<string | null> {
		const targetUsername = this.cfg.bili.loginTargetUsername;
		if (!targetUsername) return null;

		const rows = this.sqlite
			.query(`SELECT bili_cookie FROM users WHERE username = ? AND bili_cookie IS NOT NULL AND bili_cookie != '' LIMIT 1`)
			.all(targetUsername) as any[];
		return rows[0]?.bili_cookie ?? null;
	}

	getBindStatus(userId: string): { bound: boolean; avatar: string | null; nickname: string | null } {
		const cookie = this.getUserCookie(userId);
		return { bound: !!cookie?.trim(), avatar: null, nickname: null };
	}
}
