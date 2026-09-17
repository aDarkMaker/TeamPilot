export type Role = 'user' | 'admin' | 'super_admin';

export const ROLE_LABELS: Record<Role, string> = {
	super_admin: '超级管理员',
	admin: '管理员',
	user: '用户',
};

/** Compact labels for avatars, chips and comment author lines */
export const ROLE_SHORT_LABELS: Record<Role, string> = {
	super_admin: '超管',
	admin: '管理员',
	user: '成员',
};

export function roleLabel(role: Role | string | null | undefined): string {
	if (!role) return '';
	return ROLE_LABELS[role as Role] ?? role;
}

export function roleShortLabel(role: Role | string | null | undefined): string {
	if (!role) return '';
	return ROLE_SHORT_LABELS[role as Role] ?? role;
}

export const ROLE_RANK: Record<Role, number> = { user: 1, admin: 2, super_admin: 3 };

export function roleRank(role: Role | string | null | undefined): number {
	if (!role) return 0;
	return ROLE_RANK[role as Role] ?? 0;
}

export function isStaffRole(role: string | null | undefined): boolean {
	return role === 'admin' || role === 'super_admin';
}
