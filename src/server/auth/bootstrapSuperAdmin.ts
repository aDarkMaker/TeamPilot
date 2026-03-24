import type { DB } from '../db';
import { config } from '../config';
import { hashPassword } from './password';

export async function bootstrapSuperAdmin(db: DB): Promise<void> {
	const existing = await db.findUserByUsername(config.superAdmin.username);
	if (existing) return;

	const passwordHash = await hashPassword(config.superAdmin.password);
	await db.createUser({
		username: config.superAdmin.username,
		passwordHash,
		role: 'super_admin',
		status: 'active',
	});
}
