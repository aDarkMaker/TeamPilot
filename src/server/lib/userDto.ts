import type { DB } from '../db';
import { AppError } from '../types/api';
import type { User, UserAdminListItem, UserProfilePublic } from '../types/user';
import { toPublicWebpUrl } from './mediaUrl';

/** Strips passwordHash and unused fields from the admin user listing */
export function toAdminListItem(user: User): UserAdminListItem {
	return {
		id: user.id,
		username: user.username,
		role: user.role,
		status: user.status,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}

export function toPublicProfile(user: User): UserProfilePublic {
	return {
		id: user.id,
		username: user.username,
		nickname: user.nickname,
		signature: user.signature,
		qq: user.qq,
		avatarUrl: toPublicWebpUrl(user.avatarPath),
		profileBackgroundUrl: toPublicWebpUrl(user.profileBgPath),
		role: user.role,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		birthdayMonth: user.birthdayMonth,
		birthdayDay: user.birthdayDay,
	};
}

export async function loadUserOrThrow(db: DB, userId: string): Promise<User> {
	const user = await db.findUserById(userId);
	if (!user) throw new AppError(404, 'USER_NOT_FOUND', '查无此人啦');
	return user;
}
