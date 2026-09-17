import { AppError } from '../types/api';
import type { Role } from '../types/auth';
import type { User } from '../types/user';

/** Shared admission checks for admin-facing user operations */

export function assertTargetUser(user: User | null | undefined): asserts user is User {
	if (!user) throw new AppError(404, 'USER_NOT_FOUND', '查无此人啦');
}

export function assertNotSuperAdmin(user: User, message: string): void {
	if (user.role === 'super_admin') {
		throw new AppError(409, 'INVALID_TARGET', message);
	}
}

/** An admin may only touch plain users; super_admin is unrestricted */
export function assertAdminCanTouch(actorRole: Role, targetRole: Role, message: string): void {
	if (actorRole === 'admin' && targetRole !== 'user') {
		throw new AppError(409, 'INVALID_TARGET', message);
	}
}
