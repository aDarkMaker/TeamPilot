import type { DB } from '../db';
import { hashPassword } from './password';
import { JOINUS_PUBLIC_USERNAME } from './joinusPublic';

export async function bootstrapJoinUsPublicUser(db: DB): Promise<void> {
	const existing = await db.findUserByUsername(JOINUS_PUBLIC_USERNAME);
	if (existing) return;

	const passwordHash = await hashPassword(`joinus-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	await db.createUser({
		username: JOINUS_PUBLIC_USERNAME,
		passwordHash,
		role: 'user',
		status: 'active',
	});
}

export async function getJoinUsPublicUserId(db: DB): Promise<string> {
	const u = await db.findUserByUsername(JOINUS_PUBLIC_USERNAME);
	if (!u) throw new Error('JOINUS_PUBLIC_USER_NOT_FOUND');
	return u.id;
}
