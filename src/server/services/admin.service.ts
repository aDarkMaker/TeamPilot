import type { DB } from '../db';
import { isJoinUsPublicUsername } from '../auth/joinusPublic';
import { AppError } from '../types/api';
import type { Role } from '../types/auth';
import type { User, UserAdminListItem } from '../types/user';
import { assertAdminCanTouch, assertNotSuperAdmin, assertTargetUser } from '../lib/adminGuards';
import { toAdminListItem } from '../lib/userDto';

export class AdminService {
	constructor(private db: DB) {}

	async listUsers(): Promise<UserAdminListItem[]> {
		const users = await this.db.listUsers();
		return users.map(toAdminListItem);
	}

	private async loadTarget(targetUserId: string): Promise<User> {
		const user = await this.db.findUserById(targetUserId);
		assertTargetUser(user);
		return user;
	}

	async appointAdmin(targetUserId: string) {
		const user = await this.loadTarget(targetUserId);
		assertNotSuperAdmin(user, '大老板的身份动不得～');
		await this.db.updateUserRole(targetUserId, 'admin');
	}

	async revokeAdmin(targetUserId: string) {
		const user = await this.loadTarget(targetUserId);
		assertNotSuperAdmin(user, '大老板的身份动不得～');
		if (user.role !== 'admin') {
			throw new AppError(409, 'INVALID_TARGET', '这位还不是管理员呢');
		}
		await this.db.updateUserRole(targetUserId, 'user');
	}

	async disableUser(targetUserId: string, actorRole: Role) {
		const user = await this.loadTarget(targetUserId);
		if (user.status === 'disabled') {
			throw new AppError(409, 'INVALID_TARGET', '已经进小黑屋了');
		}
		assertNotSuperAdmin(user, '大老板可不能关小黑屋');
		assertAdminCanTouch(actorRole, user.role, '管理员之间不能互关小黑屋');
		await this.db.updateUserStatus(targetUserId, 'disabled');
	}

	async enableUser(targetUserId: string, actorRole: Role) {
		const user = await this.loadTarget(targetUserId);
		if (user.status !== 'disabled') {
			throw new AppError(409, 'INVALID_TARGET', '人还好好的，禁用什么呀');
		}
		assertNotSuperAdmin(user, '大老板的状态不能这么乱改');
		assertAdminCanTouch(actorRole, user.role, '管理员之间不能互捞啦');
		await this.db.updateUserStatus(targetUserId, 'active');
	}

	async deleteUserPermanently(targetUserId: string, actorUserId: string, actorRole: Role) {
		const user = await this.loadTarget(targetUserId);
		if (user.id === actorUserId) {
			throw new AppError(409, 'INVALID_TARGET', '不能把自己删了呀');
		}
		if (isJoinUsPublicUsername(user.username)) {
			throw new AppError(409, 'INVALID_TARGET', '公开招募账号不能删');
		}
		if (user.status !== 'disabled') {
			throw new AppError(409, 'INVALID_TARGET', '先关小黑屋再说再见吧');
		}
		assertNotSuperAdmin(user, '大老板删不掉的');
		assertAdminCanTouch(actorRole, user.role, '管理员之间不能互删');
		await this.db.deleteUser(targetUserId);
	}
}
