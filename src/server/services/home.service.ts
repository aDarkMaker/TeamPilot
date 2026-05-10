import { z } from "zod";
import type { DB, Cache } from "../db";
import { AppError } from "../types/api";
import type { AppConfig } from "../config";
import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { BilibiliService } from './bilibili.service';
import { isTrustedBiliCdnUrl, toBiliProxyImagePath } from '../lib/biliCdnImage';

const createAnnouncementSchema = z.object({
    title: z.string().trim().min(1).max(80),
    contentMarkdown: z.string().trim().min(1).max(20000),
    isPinned: z.boolean().optional().default(false),
});

type BiliDynamic = {
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

function normalizeBiliItem(item: any): BiliDynamic {
    const modules = item?.modules ?? {};
    const author = modules?.module_author ?? {};
    const dynamic = modules?.module_dynamic ?? {};
    const major = dynamic?.major ?? {};
    const archive = major?.archive ?? null;

    const text = dynamic?.desc?.text ?? archive?.desc ?? archive?.title ?? '';
    const title = archive?.title ?? dynamic?.desc?.text?.slice(0, 28) ?? 'B站动态';
    const jumpUrlRaw = archive?.jump_url ?? dynamic?.jump_url ?? null;
    const jumpUrl =
        typeof jumpUrlRaw === 'string'
            ? (jumpUrlRaw.startsWith('//') ? `https:${jumpUrlRaw}` : jumpUrlRaw)
            : null;

    const pics = major?.opus?.pics;
    const picUrlRaw = Array.isArray(pics) && pics[0] ? pics[0]?.url ?? pics[0]?.src : null;
    const picUrl = typeof picUrlRaw === 'string' ? picUrlRaw : null;
    const coverUrl = typeof archive?.cover === 'string' ? archive.cover : null;
    const bvid = typeof archive?.bvid === 'string' ? archive.bvid : null;

    const mediaType: BiliDynamic['mediaType'] = bvid ? 'video' : picUrl ? 'image' : coverUrl ? 'image' : 'none';
    const rawUrl = mediaType === 'image' ? (picUrl ?? coverUrl ?? null) : coverUrl ?? null;
    const mediaUrl = rawUrl ? toBiliProxyImagePath(rawUrl) : null;
    const videoEmbedUrl = bvid ? `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&high_quality=1` : null;
    
    return {
        id: String(item?.id_str ?? item?.id ?? ''),
        title: String(title ?? 'B站动态'),
        text: String(text ?? ''),
        jumpUrl,
        mediaType,
        mediaUrl,
        videoEmbedUrl,
        pubTs: typeof author?.pub_ts === 'number' ? author.pub_ts : null,
        pubTimeText: typeof author?.pub_time === 'string' ? author.pub_time : null,
    };
}

export class HomeService {
    constructor(
        private db: DB,
        private cache: Cache,
        private cfg: AppConfig,
        private bili: BilibiliService,
    ) {}

    private toWebpUrl(storedPath: string | null | undefined): string | null {
        if (!storedPath) return null;
        const normalized = String(storedPath).replace(/^\/+/, '');
        const dot = normalized.lastIndexOf('.');
        const base = dot >= 0 ? normalized.slice(0, dot) : normalized;
        return `/uploads/${base}.webp`;
    }

    private toDayYmd(): { ymd: string; month: number; day: number } {
        const now = new Date();
        const parts = new Intl.DateTimeFormat('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(now);

        const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
        const y = get('year');
        const m = get('month');
        const d = get('day');
        return { ymd: `${y}-${m}-${d}`, month: Number(m), day: Number(d) };
    }

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
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                referer: 'https://www.bilibili.com/',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) throw new AppError(502, 'BILI_IMAGE_FAILED', '图片加载失败');

        const arrayBuf = await res.arrayBuffer();
        const input = Buffer.from(arrayBuf);

        const webp = await sharp(input)
            .resize({ width: 640, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        writeFileSync(cachePath, webp);
        return { buffer: webp, contentType: 'image/webp' };
    }

    async listTodayBirthdays() {
        const { month, day, ymd } = this.toDayYmd();
        const users = await this.db.listUsersByBirthday({ month, day });
        const data = users.map((u) => ({
            id: u.id,
            username: u.username,
            nickname: u.nickname,
            avatarUrl: this.toWebpUrl(u.avatarPath),
        }));
        return { ymd, users: data };
    }

    async listWishes(recipientUserId: string) {
        const { ymd } = this.toDayYmd();
        const rows = await this.db.listBirthdayWishes({ recipientUserId, wishDate: ymd });
        return {
            recipientUserId,
            wishDate: ymd,
            items: rows.map((r) => ({
                id: r.id,
                message: r.message,
                createdAt: r.createdAt,
                author: {
                    id: r.authorId,
                    username: r.authorUsername,
                    nickname: r.authorNickname,
                    avatarUrl: this.toWebpUrl(r.authorAvatarPath),
                },
            })),
        };
    }

    async createWish(actor: { id: string }, body: unknown) {
        const schema = z.object({
            recipientUserId: z.string().trim().min(1),
            message: z.string().trim().min(1).max(120),
        });
        const p = schema.parse(body);

        const { month, day, ymd } = this.toDayYmd();
        const b = await this.db.listUsersByBirthday({ month, day });
        const ok = b.some((u) => String(u.id) === String(p.recipientUserId));
        if (!ok) throw new AppError(400, 'NOT_BIRTHDAY_TODAY', '今天不是TA的生日哦！');

        try {
            const created = await this.db.createBirthdayWish({
                recipientUserId: p.recipientUserId,
                authorUserId: actor.id,
                message: p.message,
                wishDate: ymd,
            });
            return {
                id: created.id,
                message: created.message,
                author: {
                    id: created.authorId,
                    username: created.authorUsername,
                    nickname: created.authorNickname,
                    avatarUrl: this.toWebpUrl(created.authorAvatarPath),
                },
            };
        } catch (e) {
            const msg = e instanceof Error ? e.message : '';
            if (msg.includes('UNIQUE') || msg.includes('idx_birthday_wishes_unique')) {
                throw new AppError(409, 'ALREADY_WISHED', '祝福弥足珍贵，一次就够啦');
            }
            throw e;
        }
    }

    listAnnouncements(limit = 3) {
        return this.db.listHomeAnnouncements(limit);
    }

    async createAnnouncement(actor: { id: string }, body: unknown) {
        const p = createAnnouncementSchema.parse(body);
        return this.db.createHomeAnnouncement({
            title: p.title,
            contentMarkdown: p.contentMarkdown,
            isPinned: p.isPinned,
            createdBy: actor.id,
        });
    }

    async setAnnouncementPinned(id: string, isPinned: boolean) {
        await this.db.setHomeAnnouncementPinned({ id, isPinned });
    }

    async deleteAnnouncement(id: string) {
        await this.db.deleteHomeAnnouncement(id);
    }

    async listBiliDynamics() {
        const uid = this.cfg.home.biliUid;
        const cacheKey = `home:bili:${uid}`;

        let cached: string | null = null;
        try {
            cached = await this.cache.get(cacheKey);
        } catch {
        }
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
            }
        }

        const api = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${encodeURIComponent(uid)}`;
        const cookie = (await this.bili.getDynamicCookie()) || this.cfg.home.biliCookie.trim();
        const headers: Record<string, string> = {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            accept: 'application/json',
        };
        if (cookie) headers.cookie = cookie;

        const doFetch = async (signal?: AbortSignal) => {
            const res = await fetch(api, { headers, signal });
            if (!res.ok) throw new AppError(502, 'BILI_UPSTREAM_ERROR', `哔哩接口抽风中（HTTP ${res.status}）`);
            const json = (await res.json()) as any;
            const items = (json?.data?.items ?? [])
                .map(normalizeBiliItem)
                .filter((x: BiliDynamic) => x.id && x.text)
                .slice(0, 1);
            return { uid, items, fetchedAt: Date.now() };
        };

        const ctrl = AbortSignal.timeout(8000);
        try {
            const payload = await doFetch(ctrl);
            try { await this.cache.setex(cacheKey, 120, JSON.stringify(payload)); } catch { }
            return payload;
        } catch (e) {
            if (e instanceof AppError) throw e;
            const retryCtrl = AbortSignal.timeout(8000);
            try {
                const payload = await doFetch(retryCtrl);
                try { await this.cache.setex(cacheKey, 120, JSON.stringify(payload)); } catch { }
                return payload;
            } catch (e2) {
                if (e2 instanceof AppError) throw e2;
                throw new AppError(502, 'BILI_UPSTREAM_ERROR', '哔哩接口抽风中，稍后再试');
            }
        }
    }
}
