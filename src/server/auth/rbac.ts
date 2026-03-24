import type { Role } from '../types/auth';

const rank: Record<Role, number> = {
	user: 1,
	admin: 2,
	super_admin: 3,
};

export function canReviewApplication(role: Role): boolean {
	return rank[role] >= rank.admin;
}

export function canAppointAdmin(role: Role): boolean {
	return role === 'super_admin';
}
