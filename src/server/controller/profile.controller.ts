import type { Context } from 'koa';
import type { ProfileService } from '../services/profile.service';

function getUserId(ctx: Context): string {
	return ctx.state.user!.id;
}

export class ProfileController {
	constructor(private service: ProfileService) {}

	getMe = async (ctx: Context) => {
		const data = await this.service.getMe(getUserId(ctx));
		ctx.body = { ok: true, data };
	};

	patchMe = async (ctx: Context) => {
		const data = await this.service.updateProfile(getUserId(ctx), ctx.request.body);
		ctx.body = { ok: true, data };
	};

	changePassword = async (ctx: Context) => {
		await this.service.changePassword(getUserId(ctx), ctx.request.body);
		ctx.body = { ok: true, data: { status: 'ok' } };
	};

	uploadAvatar = async (ctx: Context) => {
		const file = takeSingleFile(ctx.request.file?.file);
		if (!file) throw new (await import('../types/api')).AppError(400, 'FILE_REQUIRED', '请上传文件');
		const buf = await readUploadedBuffer(file);
		const mime = file.mimetype || 'application/octet-stream';
		const data = await this.service.saveAvatar(getUserId(ctx), buf, mime);
		ctx.body = { ok: true, data };
	};

	uploadProfileBackground = async (ctx: Context) => {
		const file = takeSingleFile(ctx.request.files?.bg);
		if (!file) throw new (await import('../types/api')).AppError(400, 'FILE_REQUIRED', '请上传文件');
		const buf = await readUploadedBuffer(file);
		const mime = file.mimetype || 'application/octet-stream';
		const data = await this.service.saveProfileBackground(getUserId(ctx), buf, mime);
		ctx.body = { ok: true, data };
	};
}

type KoaUploaded = { filepath?: string; mimetype?: string; newFilename?: string };

function takeSingleFile(raw: unknown): KoaUploaded | undefined {
	if (!raw) return undefined;
	const f = Array.isArray(raw) ? raw[0] : raw;
	return f as KoaUploaded;
}

async function readUploadedBuffer(file: KoaUploaded): Promise<Buffer> {
	const { readFile, unlink } = await import('node:fs/promises');
	if (!file.filepath) throw new Error('NO_FILE_PATH');
	const buf = await readFile(file.filepath);
	await unlink(file.filepath).catch(() => undefined);
	return buf;
}