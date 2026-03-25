import type { DB } from '../db';
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

		if (user.role === 'super_admin') {
			throw new AppError(409, 'INVALID_TARGET', 'CANNOT_DISABLE_SUPER_ADMIN');
		}

		if (actorRole === 'admin' && user.role !== 'user') {
			throw new AppError(409, 'INVALID_TARGET', 'ADMIN_CANNOT_DISABLE_ADMIN');
		}

		await this.db.updateUserStatus(targetUserId, 'disabled');
	}
}
