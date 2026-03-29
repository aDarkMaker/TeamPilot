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

export function roleRank(role: Role): number {
	return rank[role];
}

export function canDeleteOthersComment(actorRole: Role, targetAuthorRole: Role): boolean {
	return rank[actorRole] > rank[targetAuthorRole];
}
