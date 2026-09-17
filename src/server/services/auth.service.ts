import { z } from 'zod';
import type { DB } from '../db';
import { AppError } from '../types/api';
import { verifyPassword, hashPassword } from '../auth/password';
import { signAccessToken } from '../auth/jwt';
import { isPasswordPolicyCompliant, LEGACY_PASSWORD_RESET } from '../auth/passwordPolicy';
import { ensureScheduleTasksForUser } from './scheduleTaskSync.service';

const loginSchema = z.object({
	username: z.string().min(1).max(50),
	password: z.string().min(8).max(128),
});

export class AuthService {
	constructor(private db: DB) {}

	async login(input: unknown) {
		const parsed = loginSchema.parse(input);

		const user = await this.db.findUserByUsername(parsed.username.trim());
		if (!user) {
			throw new AppError(401, 'INVALID_CREDENTIALS', '没有你这号人物呢！');
		}

		if (user.status !== 'active') {
			throw new AppError(403, 'ACCOUNT_DISABLED', '你怎么被封号了？');
		}

		const ok = await verifyPassword(parsed.password, user.passwordHash);
		if (!ok) {
			throw new AppError(401, 'INVALID_CREDENTIALS', '再想想密码呢～');
		}

		let passwordWasResetToDefault = false;
		if (!isPasswordPolicyCompliant(parsed.password)) {
			const newHash = await hashPassword(LEGACY_PASSWORD_RESET);
			await this.db.updateUserPasswordHash(user.id, newHash);
			passwordWasResetToDefault = true;
		}

		await ensureScheduleTasksForUser(this.db, user.id);

		const token = signAccessToken({
			sub: user.id,
			username: user.username,
			role: user.role,
		});

		return {
			token,
			passwordWasResetToDefault,
			user: {
				id: user.id,
				username: user.username,
				role: user.role,
			},
		};
	}
}
