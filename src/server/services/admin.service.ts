import type { DB } from '../db';
import { AppError } from '../types/api';

export class AdminService {
	constructor(private db: DB) {}

	async appointAdmin(targetUserId: string) {
		const user = await this.db.findUserById(targetUserId);
		if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'USER_NOT_FOUND');
		if (user.role === 'super_admin') {
			throw new AppError(409, 'INVALID_TARGET', 'CANNOT_CHANGE_SUPER_ADMIN_ROLE');
		}
		await this.db.updateUserRole(targetUserId, 'admin');
	}
}
