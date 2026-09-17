import type { AppConfig } from '../config';
import type { Cache } from '../db';
import { AppError } from '../types/api';
import { toBiliProxyImagePath } from '../lib/biliCdnImage';
import type { BilibiliService } from './bilibili.service';

export type BiliDynamic = {
	id: string;
	title: string;
	text: string;
	jumpUrl: string | null;
	mediaType: 'image' | 'video' | 'none';
	mediaUrl: string | null;
	videoEmbedUrl: string | null;
	pubTs: number | null;
	pubTimeText: string | null;
};

export type BiliDynamicFeed = {
	uid: string;
	items: BiliDynamic[];
	fetchedAt: number;
};

const USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function normalizeBiliItem(item: any): BiliDynamic {
	const modules = item?.modules ?? {};
	const author = modules?.module_author ?? {};
	const dynamic = modules?.module_dynamic ?? {};
	const major = dynamic?.major ?? {};
	const archive = major?.archive ?? null;

	const text = dynamic?.desc?.text ?? archive?.desc ?? archive?.title ?? '';
	const title = archive?.title ?? dynamic?.desc?.text?.slice(0, 28) ?? 'B站动态';
	const jumpUrlRaw = archive?.jump_url ?? dynamic?.jump_url ?? null;
	const jumpUrl = typeof jumpUrlRaw === 'string' ? (jumpUrlRaw.startsWith('//') ? `https:${jumpUrlRaw}` : jumpUrlRaw) : null;

	const pics = major?.opus?.pics;
	const picUrlRaw = Array.isArray(pics) && pics[0] ? (pics[0]?.url ?? pics[0]?.src) : null;
	const picUrl = typeof picUrlRaw === 'string' ? picUrlRaw : null;
	const coverUrl = typeof archive?.cover === 'string' ? archive.cover : null;
	const bvid = typeof archive?.bvid === 'string' ? archive.bvid : null;

	const mediaType: BiliDynamic['mediaType'] = bvid ? 'video' : picUrl || coverUrl ? 'image' : 'none';
	const rawUrl = mediaType === 'image' ? (picUrl ?? coverUrl ?? null) : (coverUrl ?? null);

	return {
		id: String(item?.id_str ?? item?.id ?? ''),
		title: String(title ?? 'B站动态'),
		text: String(text ?? ''),
		jumpUrl,
		mediaType,
		mediaUrl: rawUrl ? toBiliProxyImagePath(rawUrl) : null,
		videoEmbedUrl: bvid ? `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&high_quality=1` : null,
		pubTs: typeof author?.pub_ts === 'number' ? author.pub_ts : null,
		pubTimeText: typeof author?.pub_time === 'string' ? author.pub_time : null,
	};
}

export class BiliDynamicService {
	constructor(
		private cache: Cache,
		private cfg: AppConfig,
		private bili: BilibiliService
	) {}

	async listBiliDynamics() {
		const uid = this.cfg.home.biliUid;
		const cacheKey = `home:bili:${uid}`;

		let cached: string | null = null;
		try {
			cached = await this.cache.get(cacheKey);
		} catch {
			// ignore: cache outage falls through to the upstream fetch
		}
		if (cached) {
			try {
				return JSON.parse(cached);
			} catch {
				// ignore: a corrupted cache entry is refreshed below
			}
		}

		const api = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${encodeURIComponent(uid)}`;
		const cookie = (await this.bili.getDynamicCookie()) || this.cfg.home.biliCookie.trim();
		const headers: Record<string, string> = { 'user-agent': USER_AGENT, accept: 'application/json' };
		if (cookie) headers.cookie = cookie;

		const doFetch = async (signal?: AbortSignal): Promise<BiliDynamicFeed> => {
			const res = await fetch(api, { headers, signal });
			if (!res.ok) throw new AppError(502, 'BILI_UPSTREAM_ERROR', `哔哩接口抽风中（HTTP ${res.status}）`);
			const json = (await res.json()) as any;
			const items = (json?.data?.items ?? [])
				.map(normalizeBiliItem)
				.filter((x: BiliDynamic) => x.id && x.text)
				.slice(0, 1);
			return { uid, items, fetchedAt: Date.now() };
		};

		const cacheResult = async (payload: BiliDynamicFeed): Promise<BiliDynamicFeed> => {
			try {
				await this.cache.setex(cacheKey, 120, JSON.stringify(payload));
			} catch {
				// ignore: a cache write failure must not fail the response
			}
			return payload;
		};

		try {
			return await cacheResult(await doFetch(AbortSignal.timeout(8000)));
		} catch (e) {
			if (e instanceof AppError) throw e;
			try {
				return await cacheResult(await doFetch(AbortSignal.timeout(8000)));
			} catch (e2) {
				if (e2 instanceof AppError) throw e2;
				throw new AppError(502, 'BILI_UPSTREAM_ERROR', '哔哩接口抽风中，稍后再试');
			}
		}
	}
}
