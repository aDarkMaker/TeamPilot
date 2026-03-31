import type { DB } from '../db';
import { isJoinUsPublicUsername } from '../auth/joinusPublic';
import { AppError } from '../types/api';
import type { Role } from '../types/auth';
import type { User } from '../types/user';

export class AdminService {
	constructor(private db: DB) {}

	async listUsers(): Promise<User[]> {
		return this.db.listUsers();
	}

	async appointAdmin(targetUserId: string) {
		const user = await this.db.findUserById(targetUserId);
		if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'USER_NOT_FOUND');
		if (user.role === 'super_admin') {
			throw new AppError(409, 'INVALID_TARGET', 'CANNOT_CHANGE_SUPER_ADMIN_ROLE');
		}
		await this.db.updateUserRole(targetUserId, 'admin');
	}

	async revokeAdmin(targetUserId: string) {
		const user = await this.db.findUserById(targetUserId);
		if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'USER_NOT_FOUND');
		if (user.role === 'super_admin') {
			throw new AppError(409, 'INVALID_TARGET', 'CANNOT_CHANGE_SUPER_ADMIN_ROLE');
		}
		if (user.role !== 'admin') {
			throw new AppError(409, 'INVALID_TARGET', 'USER_IS_NOT_AN_ADMIN');
		}
		await this.db.updateUserRole(targetUserId, 'user');
	}

	async disableUser(targetUserId: string, actorRole: Role) {
		const user = await this.db.findUserById(targetUserId);
		if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'USER_NOT_FOUND');

		if (user.status === 'disabled') {
			throw new AppError(409, 'INVALID_TARGET', 'USER_ALREADY_DISABLED');
		}

		if (user.role === 'super_admin') {
			throw new AppError(409, 'INVALID_TARGET', 'CANNOT_DISABLE_SUPER_ADMIN');
		}

		if (actorRole === 'admin' && user.role !== 'user') {
			throw new AppError(409, 'INVALID_TARGET', 'ADMIN_CANNOT_DISABLE_ADMIN');
		}

		await this.db.updateUserStatus(targetUserId, 'disabled');
	}

	async enableUser(targetUserId: string, actorRole: Role) {
		const user = await this.db.findUserById(targetUserId);
		if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'USER_NOT_FOUND');

		if (user.status !== 'disabled') {
			throw new AppError(409, 'INVALID_TARGET', 'USER_NOT_DISABLED');
		}

		if (user.role === 'super_admin') {
			throw new AppError(409, 'INVALID_TARGET', 'CANNOT_CHANGE_SUPER_ADMIN_STATUS');
		}

		if (actorRole === 'admin' && user.role !== 'user') {
			throw new AppError(409, 'INVALID_TARGET', 'ADMIN_CANNOT_ENABLE_ADMIN');
		}

		await this.db.updateUserStatus(targetUserId, 'active');
	}

	async deleteUserPermanently(targetUserId: string, actorUserId: string, actorRole: Role) {
		const user = await this.db.findUserById(targetUserId);
		if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'USER_NOT_FOUND');

		if (user.id === actorUserId) {
			throw new AppError(409, 'INVALID_TARGET', 'CANNOT_DELETE_SELF');
		}

		if (isJoinUsPublicUsername(user.username)) {
			throw new AppError(409, 'INVALID_TARGET', 'CANNOT_DELETE_JOINUS_PUBLIC');
		}

		if (user.status !== 'disabled') {
			throw new AppError(409, 'INVALID_TARGET', 'USER_MUST_BE_DISABLED_TO_DELETE');
		}

		if (user.role === 'super_admin') {
			throw new AppError(409, 'INVALID_TARGET', 'CANNOT_DELETE_SUPER_ADMIN');
		}

		if (actorRole === 'admin' && user.role !== 'user') {
			throw new AppError(409, 'INVALID_TARGET', 'ADMIN_CANNOT_DELETE_ADMIN');
		}

		await this.db.deleteUser(targetUserId);
	}
}
