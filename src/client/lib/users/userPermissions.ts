import { isStaffRole, type Role } from '@/lib/roles';
import type { ManagedUser } from './usersClient';

/**
 * Who the current viewer may moderate: nobody controls a super admin, an admin
 * only touches regular users and a super admin can also manage admins.
 */
export function canManageUser(me: Role | null | undefined, target: ManagedUser): boolean {
	if (!isStaffRole(me)) return false;
	if (target.role === 'super_admin') return false;
	if (me === 'admin') return target.role === 'user';
	return true;
}

/** Only active accounts can be disabled; disabled ones are restored or removed */
export const canDisable = (me: Role | null | undefined, target: ManagedUser) => canManageUser(me, target) && target.status === 'active';

export const canRestoreOrRemove = (me: Role | null | undefined, target: ManagedUser) => canManageUser(me, target) && target.status === 'disabled';

export const canAppointAdmin = (me: Role | null | undefined, target: ManagedUser) =>
	me === 'super_admin' && target.role === 'user' && target.status === 'active';

export const canRevokeAdmin = (me: Role | null | undefined, target: ManagedUser) =>
	me === 'super_admin' && target.role === 'admin' && target.status === 'active';
