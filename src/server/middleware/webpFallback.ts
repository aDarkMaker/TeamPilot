import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Context, Next } from 'koa';
import sharp from 'sharp';

const UPLOAD_ROOT = join(process.cwd(), 'data', 'uploads');
const WEBP_QUALITY = 80;

const ALT_EXTS = ['.png', '.jpg', '.jpeg'];

export async function webpFallback(ctx: Context, next: Next) {
	if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
		return next();
	}

	const p = ctx.path;
	if (!p.startsWith('/uploads/')) {
		return next();
	}

	const dot = p.lastIndexOf('.');
	if (dot < 0) {
		return next();
	}

	const ext = p.slice(dot).toLowerCase();
	if (ext !== '.webp') {
		return next();
	}

	const base = p.slice('/uploads/'.length, dot);
	const absWebp = join(UPLOAD_ROOT, `${base}.webp`);

	if (existsSync(absWebp)) {
		return next();
	}

	let srcAbs = '';
	for (const alt of ALT_EXTS) {
		const candidate = join(UPLOAD_ROOT, `${base}${alt}`);
		if (existsSync(candidate)) {
			srcAbs = candidate;
			break;
		}
	}

	if (!srcAbs) {
		return next();
	}

	const isAvatar = base.startsWith('avatars/');
	try {
		const pipeline = sharp(srcAbs);
		if (isAvatar) {
			pipeline.resize(256, 256, { fit: 'cover', position: 'centre' });
		} else {
			pipeline.resize(1920, undefined, { fit: 'inside', withoutEnlargement: true });
		}
		const compressed = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();

		const outDir = dirname(absWebp);
		mkdirSync(outDir, { recursive: true });
		writeFileSync(absWebp, compressed);
	} catch {
		return next();
	}

	return next();
}
