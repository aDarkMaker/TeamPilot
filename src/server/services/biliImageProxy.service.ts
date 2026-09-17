import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

import { AppError } from '../types/api';
import { isTrustedBiliCdnUrl } from '../lib/biliCdnImage';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/** Fetches, downscales and disk-caches images referenced by B站 dynamics */
export class BiliImageProxyService {
	async proxyBiliImage(encodedUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
		const rawUrl = decodeURIComponent(encodedUrl);
		if (!isTrustedBiliCdnUrl(rawUrl)) {
			throw new AppError(400, 'BILI_IMAGE_BAD_URL', '不支持的图片地址');
		}

		const hash = createHash('sha256').update(rawUrl).digest('hex').slice(0, 16);
		const cacheDir = join(process.cwd(), 'data', 'bili-cache');
		mkdirSync(cacheDir, { recursive: true });
		const cachePath = join(cacheDir, `${hash}.webp`);

		if (existsSync(cachePath)) {
			return { buffer: readFileSync(cachePath), contentType: 'image/webp' };
		}

		const res = await fetch(rawUrl, {
			headers: { 'user-agent': USER_AGENT, referer: 'https://www.bilibili.com/' },
			signal: AbortSignal.timeout(10000),
		});
		if (!res.ok) throw new AppError(502, 'BILI_IMAGE_FAILED', '图片加载失败');

		const webp = await sharp(Buffer.from(await res.arrayBuffer()))
			.resize({ width: 640, withoutEnlargement: true })
			.webp({ quality: 80 })
			.toBuffer();

		writeFileSync(cachePath, webp);
		return { buffer: webp, contentType: 'image/webp' };
	}
}
