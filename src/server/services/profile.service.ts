import { z } from 'zod';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DB } from '../db';
import { AppError } from '../types/api';
import type { UserProfilePublic } from '../types/user';
import { verifyPassword, hashPassword } from '../auth/password';
import { passwordPlainSchema } from '../auth/passwordPolicy';
import { loadUserOrThrow, toPublicProfile } from '../lib/userDto';
import sharp from 'sharp';

const patchSchema = z.object({
	nickname: z.string().min(1).max(32).optional().nullable(),
	signature: z.string().max(200).optional().nullable(),
	qq: z
		.string()
		.regex(/^[1-9]\d{4,10}$/)
		.optional()
		.nullable(),
	birthdayMonth: z.number().min(1).max(12).optional().nullable(),
	birthdayDay: z.number().min(1).max(31).optional().nullable(),
});

const passwordSchema = z.object({
	oldPassword: z.string().min(1),
	newPassword: passwordPlainSchema,
});

const ALLOWED_MIME = new Map<string, string>([
	['image/jpeg', 'jpg'],
	['image/png', 'png'],
	['image/webp', 'webp'],
]);

const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_ROOT = join(process.cwd(), 'data', 'uploads');

function isValidMonthDay(month: number, day: number): boolean {
	const maxDay = new Date(2024, month, 0).getDate();
	return day >= 1 && day <= maxDay;
}

export class ProfileService {
	constructor(private db: DB) {}

	async getMe(userId: string): Promise<UserProfilePublic> {
		return toPublicProfile(await loadUserOrThrow(this.db, userId));
	}

	async updateProfile(userId: string, body: unknown): Promise<UserProfilePublic> {
		const parsed = patchSchema.parse(body);
		const patch: Parameters<DB['updateUserProfile']>[1] = {};

		const hasMonth = Object.prototype.hasOwnProperty.call(parsed, 'birthdayMonth');
		const hasDay = Object.prototype.hasOwnProperty.call(parsed, 'birthdayDay');

		if ('nickname' in parsed) patch.nickname = parsed.nickname ?? null;
		if ('signature' in parsed) patch.signature = parsed.signature ?? null;
		if ('qq' in parsed) patch.qq = parsed.qq ?? null;

		if (hasMonth || hasDay) {
			const m = parsed.birthdayMonth ?? null;
			const d = parsed.birthdayDay ?? null;

			if (m == null && d == null) {
				patch.birthdayMonth = null;
				patch.birthdayDay = null;
			} else if (m == null || d == null) {
				throw new AppError(400, 'INVALID_BIRTHDATE', '告诉我几月几号呗');
			} else if (!isValidMonthDay(m, d)) {
				throw new AppError(400, 'INVALID_BIRTHDATE', '真的存在这一天吗！');
			} else {
				patch.birthdayMonth = m;
				patch.birthdayDay = d;
			}
		}

		await this.db.updateUserProfile(userId, patch);
		return toPublicProfile(await loadUserOrThrow(this.db, userId));
	}

	async changePassword(userId: string, body: unknown): Promise<void> {
		const { oldPassword, newPassword } = passwordSchema.parse(body);
		if (oldPassword === newPassword) {
			throw new AppError(400, 'INVALID_PASSWORD', '新密码换个花样嘛');
		}
		const user = await loadUserOrThrow(this.db, userId);
		const ok = await verifyPassword(oldPassword, user.passwordHash);
		if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', '当务之急是找回而非修改');
		const newPasswordHash = await hashPassword(newPassword);
		await this.db.updateUserPasswordHash(userId, newPasswordHash);
	}

	async saveAvatar(userId: string, buffer: Buffer, mime: string): Promise<UserProfilePublic> {
		const ext = ALLOWED_MIME.get(mime);
		if (!ext) throw new AppError(400, 'INVALID_MIME', '不支持的图片格式');
		if (buffer.length > MAX_BYTES) throw new AppError(400, 'FILE_TOO_LARGE', '图片太大了');

		const compressed = await sharp(buffer).resize(256, 256, { fit: 'cover', position: 'centre' }).webp({ quality: 80 }).toBuffer();

		const dir = join(UPLOAD_ROOT, 'avatars');
		mkdirSync(dir, { recursive: true });
		const relative = `avatars/${userId}.webp`;
		const abs = join(UPLOAD_ROOT, relative);
		writeFileSync(abs, compressed);

		await this.db.updateUserProfile(userId, { avatarPath: relative });
		return toPublicProfile(await loadUserOrThrow(this.db, userId));
	}

	async saveProfileBackground(userId: string, buffer: Buffer, mime: string): Promise<UserProfilePublic> {
		const ext = ALLOWED_MIME.get(mime);
		if (!ext) throw new AppError(400, 'INVALID_MIME', '不支持的图片格式');
		if (buffer.length > MAX_BYTES) throw new AppError(400, 'FILE_TOO_LARGE', '文件过大');

		const compressed = await sharp(buffer).resize(1920, undefined, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();

		const dir = join(UPLOAD_ROOT, 'backgrounds');
		mkdirSync(dir, { recursive: true });
		const relative = `backgrounds/${userId}.webp`;
		const abs = join(UPLOAD_ROOT, relative);
		writeFileSync(abs, compressed);

		await this.db.updateUserProfile(userId, { profileBgPath: relative });
		return toPublicProfile(await loadUserOrThrow(this.db, userId));
	}

	async clearAvatar(userId: string): Promise<UserProfilePublic> {
		await this.db.updateUserProfile(userId, { avatarPath: null });
		return toPublicProfile(await loadUserOrThrow(this.db, userId));
	}

	async clearProfileBackground(userId: string): Promise<UserProfilePublic> {
		await this.db.updateUserProfile(userId, { profileBgPath: null });
		return toPublicProfile(await loadUserOrThrow(this.db, userId));
	}
}
