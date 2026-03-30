import { z } from "zod";
import type { DB, Cache } from "../db";
import { AppError } from "../types/api";
import type { AppConfig } from "../config";

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
    const mediaUrl = mediaType === 'image' ? (picUrl ?? coverUrl ?? null) : coverUrl ?? null;
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
        private cfg: AppConfig
    ) {}

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
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // ignore bad cache
            }
        }

        const api = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${encodeURIComponent(uid)}`;
        const cookie = this.cfg.home.biliCookie.trim();
        const res = await fetch(api, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                accept: 'application/json',
                ...(cookie ? { cookie } : {}),
            },
        });
        if (!res.ok) throw new AppError(502, 'BILI_UPSTREAM_ERROR', `BILI_HTTP_${res.status}`);

        const json = (await res.json()) as any;
        const items = (json?.data?.items ?? [])
            .map(normalizeBiliItem)
            .filter((x: BiliDynamic) => x.id && x.text)
            .slice(0, 1);

        const payload = { uid, items, fetchedAt: Date.now() };
        await this.cache.setex(cacheKey, 120, JSON.stringify(payload));
        return payload;
    }
}
