import { mkdirSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { basename, join } from 'node:path';

import serve from 'koa-static';
import mount from 'koa-mount';
import type Koa from 'koa';

import { webpFallback } from '../middleware/webpFallback';

const LEGACY_BIN_EXT_MIME: Record<string, string> = {
	mp4: 'video/mp4',
	m4v: 'video/mp4',
	webm: 'video/webm',
	mov: 'video/quicktime',
	ogv: 'video/ogg',
	ogg: 'video/ogg',
	pdf: 'application/pdf',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
};

/**
 * Early versions appended `.bin` to uploads with an unrecognised MIME type.
 * Recover the real extension from `name.ext.bin` so existing attachments still serve correctly.
 */
export function setJoinusFileHeaders(res: ServerResponse, filePath: string): void {
	const name = basename(filePath);
	if (!name.toLowerCase().endsWith('.bin')) return;
	const m = /\.([a-z0-9]{2,5})\.bin$/i.exec(name);
	const ext = m?.[1]?.toLowerCase();
	const ct = ext ? LEGACY_BIN_EXT_MIME[ext] : undefined;
	if (ct) res.setHeader('Content-Type', ct);
}

/** Mounts the upload + joinus file trees, creating them on first boot */
export function mountStaticFiles(app: Koa): void {
	const uploadRoot = join(process.cwd(), 'data', 'uploads');
	mkdirSync(uploadRoot, { recursive: true });
	app.use(webpFallback);
	app.use(mount('/uploads', serve(uploadRoot)));

	const joinusRoot = join(process.cwd(), 'data', 'joinus');
	mkdirSync(joinusRoot, { recursive: true });
	app.use(mount('/joinus-files', serve(joinusRoot, { setHeaders: setJoinusFileHeaders })));
}
