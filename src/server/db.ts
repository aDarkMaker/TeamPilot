import type { Database } from 'bun:sqlite';
import type Redis from 'ioredis';
import type { Role, UserStatus } from './types/auth';
import type { User } from './types/user';
import type { AccountApplication } from './types/application';

export interface DB {
	findUserByUsername(username: string): Promise<User | null>;
	findUserById(id: string): Promise<User | null>;
	createUser(input: { username: string; passwordHash: string; role: Role; status: UserStatus }): Promise<User>;
	updateUserRole(userId: string, role: Role): Promise<void>;

	createAccountApplication(input: { username: string; passwordHash: string; reason: string }): Promise<AccountApplication>;
	findApplicationById(id: string): Promise<AccountApplication | null>;
	findPendingApplications(): Promise<AccountApplication[]>;
	setApplicationReview(input: { id: string; status: 'approved' | 'rejected'; reviewedBy: string }): Promise<void>;
}

export interface Cache {
	get(key: string): Promise<string | null>;
	setex(key: string, ttlSeconds: number, value: string): Promise<'OK' | null>;
	del(key: string): Promise<number>;
	incr(key: string): Promise<number>;
	expire(key: string, seconds: number): Promise<number>;
}

function mapUser(row: any): User {
	return {
		id: String(row.id),
		username: row.username,
		passwordHash: row.password_hash,
		role: row.role,
		status: row.status,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
	};
}

function mapApplication(row: any): AccountApplication {
	return {
		id: String(row.id),
		username: row.username,
		passwordHash: row.password_hash,
		reason: row.reason,
		status: row.status,
		reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
		reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
		createdAt: String(row.created_at),
	};
}

export function createDb(sqlite: Database): DB {
	return {
		async findUserByUsername(username) {
			const row = sqlite.query('SELECT * FROM users WHERE username = ? LIMIT 1').get(username);
			return row ? mapUser(row) : null;
		},
		async findUserById(id) {
			const row = sqlite.query('SELECT * FROM users WHERE id = ? LIMIT 1').get(id);
			return row ? mapUser(row) : null;
		},
		async createUser(input) {
			const result = sqlite
				.query('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)')
				.run(input.username, input.passwordHash, input.role, input.status);
			sqlite.query('UPDATE users SET updated_at = datetime(\'now\') WHERE id = ?').run(result.lastInsertRowid);
			const row = sqlite.query('SELECT * FROM users WHERE id = ? LIMIT 1').get(result.lastInsertRowid);
			return mapUser(row);
		},
		async updateUserRole(userId, role) {
			sqlite.query('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ?').run(role, userId);
		},
		async createAccountApplication(input) {
			const result = sqlite
				.query(`INSERT INTO account_applications (username, password_hash, reason, status) VALUES (?, ?, ?, 'pending')`)
				.run(input.username, input.passwordHash, input.reason);
			const row = sqlite.query('SELECT * FROM account_applications WHERE id = ? LIMIT 1').get(result.lastInsertRowid);
			return mapApplication(row);
		},
		async findApplicationById(id) {
			const row = sqlite.query('SELECT * FROM account_applications WHERE id = ? LIMIT 1').get(id);
			return row ? mapApplication(row) : null;
		},
		async findPendingApplications() {
			const rows = sqlite.query(`SELECT * FROM account_applications WHERE status = 'pending' ORDER BY created_at ASC`).all();
			return rows.map(mapApplication);
		},
		async setApplicationReview(input) {
			sqlite
				.query('UPDATE account_applications SET status = ?, reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?')
				.run(input.status, input.reviewedBy, input.id);
		},
	};
}

export function createCache(redis: Redis): Cache {
	return {
		get: (key) => redis.get(key),
		setex: (key, ttl, value) => redis.setex(key, ttl, value),
		del: (key) => redis.del(key),
		incr: (key) => redis.incr(key),
		expire: (key, seconds) => redis.expire(key, seconds),
	};
}
