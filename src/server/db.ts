import type { Database, SQLQueryBindings } from 'bun:sqlite';
import type Redis from 'ioredis';
import type { Role, UserStatus } from './types/auth';
import type { User } from './types/user';
import type { AccountApplication } from './types/application';
import type { Schedule, ScheduleParticipant } from './types/schedule';

export interface DB {
	findUserByUsername(username: string): Promise<User | null>;
	findUserById(id: string): Promise<User | null>;
	createUser(input: { username: string; passwordHash: string; role: Role; status: UserStatus }): Promise<User>;
	updateUserRole(userId: string, role: Role): Promise<void>;
	listUsers(): Promise<User[]>;
	updateUserStatus(userId: string, status: UserStatus): Promise<void>;

	createSchedule(input: {
		title: string;
		description: string | null;
		location: string | null;
		year: number;
		month: number;
		day: number;
		startAt: string;
		endAt: string;
		durationMinutes: number;
		createdBy: string;
		participantIds: string[];
	}): Promise<Schedule>;

	updateSchedule(
		input: {
			id: string;
			title: string;
			description: string | null;
			location: string | null;
			year: number;
			month: number;
			day: number;
			startAt: string;
			endAt: string;
			durationMinutes: number;
		},
		actor: { id: string }
	): Promise<Schedule>;

	replaceScheduleParticipants(input: { scheduleId: string; participantIds: string[] }): Promise<void>;

	listSchedulesByMonth(input: { year: number; month: number }): Promise<Schedule[]>;

	listSchedulesByDayForUser(input: { year: number; month: number; day: number; userId: string }): Promise<Schedule[]>;

	listSchedulesByDateRangeForUser(input: { startDate: string; endDate: string; userId: string }): Promise<Schedule[]>;

	listScheduleParticipants(scheduleId: string): Promise<ScheduleParticipant[]>;

	searchUsersByUsername(keyword: string, limit?: number): Promise<Array<{ id: string; username: string; avatarPath: string | null }>>;

	deleteSchedule(scheduleId: string, actor: { id: string }): Promise<void>;

	createAccountApplication(input: { username: string; passwordHash: string; reason: string }): Promise<AccountApplication>;
	findApplicationById(id: string): Promise<AccountApplication | null>;
	findPendingApplications(): Promise<AccountApplication[]>;
	setApplicationReview(input: { id: string; status: 'approved' | 'rejected'; reviewedBy: string }): Promise<void>;
	updateUserProfile(
		userId: string,
		patch: {
			nickname?: string | null;
			signature?: string | null;
			qq?: string | null;
			avatarPath?: string | null;
			profileBgPath?: string | null;
		}
	): Promise<void>;
	updateUserPasswordHash(userId: string, passwordHash: string): Promise<void>;
}

export interface Cache {
	get(key: string): Promise<string | null>;
	setex(key: string, ttlSeconds: number, value: string): Promise<'OK' | null>;
	del(key: string): Promise<number>;
	incr(key: string): Promise<number>;
	expire(key: string, seconds: number): Promise<number>;
}

function mapSchedule(row: any): Schedule {
	return {
		id: String(row.id),
		title: row.title,
		description: row.description ?? null,
		location: row.location ?? null,
		year: Number(row.year),
		month: Number(row.month),
		day: Number(row.day),
		startAt: row.start_at,
		endAt: row.end_at,
		durationMinutes: Number(row.duration_minutes),
		createdBy: String(row.created_by),
		createdAt: String(row.created_at),
		updatedAt: String(row.updated_at),
	};
}

function mapScheduleParticipant(row: any): ScheduleParticipant {
	return {
		scheduleId: String(row.schedule_id),
		userId: String(row.user_id),
		username: row.username,
		avatarPath: row.avatar_path ?? null,
	};
}

function mapUser(row: any): User {
	return {
		id: String(row.id),
		username: row.username,
		passwordHash: row.password_hash,
		role: row.role,
		status: row.status,
		nickname: row.nickname ?? null,
		signature: row.signature ?? null,
		qq: row.qq ?? null,
		avatarPath: row.avatar_path ?? null,
		profileBgPath: row.profile_bg_path ?? null,
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
				.query(
					`INSERT INTO users (username, password_hash, role, status, nickname, signature, qq, avatar_path, profile_bg_path)
			 VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL)`
				)
				.run(input.username, input.passwordHash, input.role, input.status);
			sqlite.query("UPDATE users SET updated_at = datetime('now') WHERE id = ?").run(result.lastInsertRowid);
			const row = sqlite.query('SELECT * FROM users WHERE id = ? LIMIT 1').get(result.lastInsertRowid);
			return mapUser(row);
		},
		async updateUserRole(userId, role) {
			sqlite.query("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, userId);
		},
		async listUsers() {
			const rows = sqlite.query('SELECT * FROM users ORDER BY created_at DESC').all();
			return rows.map(mapUser);
		},
		async updateUserStatus(userId, status) {
			sqlite.query("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, userId);
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
				.query("UPDATE account_applications SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?")
				.run(input.status, input.reviewedBy, input.id);
		},
		async updateUserProfile(userId, patch) {
			const set: string[] = [];
			const vals: SQLQueryBindings[] = [];
			if (patch.nickname !== undefined) {
				set.push('nickname = ?');
				vals.push(patch.nickname);
			}
			if (patch.signature !== undefined) {
				set.push('signature = ?');
				vals.push(patch.signature);
			}
			if (patch.qq !== undefined) {
				set.push('qq = ?');
				vals.push(patch.qq);
			}
			if (patch.avatarPath !== undefined) {
				set.push('avatar_path = ?');
				vals.push(patch.avatarPath);
			}
			if (patch.profileBgPath !== undefined) {
				set.push('profile_bg_path = ?');
				vals.push(patch.profileBgPath);
			}
			if (set.length === 0) {
				return;
			}
			set.push("updated_at = datetime('now')");
			vals.push(userId);
			sqlite.query(`UPDATE users SET ${set.join(', ')} WHERE id = ?`).run(...vals);
		},
		async updateUserPasswordHash(userId, passwordHash) {
			sqlite.query("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(passwordHash, userId);
		},
		async createSchedule(input) {
			const tx = sqlite.transaction((payload: typeof input) => {
				const result = sqlite
					.query(
						`INSERT INTO schedules
							(title, description, location, year, month, day, start_at, end_at, duration_minutes, created_by)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.run(
						payload.title,
						payload.description,
						payload.location,
						payload.year,
						payload.month,
						payload.day,
						payload.startAt,
						payload.endAt,
						payload.durationMinutes,
						payload.createdBy,
					);
				
				const scheduleId = String(result.lastInsertRowid);

				const uniq = Array.from(new Set(payload.participantIds));
				for (const userId of uniq) {
					sqlite
						.query(`INSERT OR IGNORE INTO schedule_participants (schedule_id, user_id) VALUES (?, ?)`)
						.run(scheduleId, userId);
				}

				const row = sqlite.query(`SELECT * FROM schedules WHERE id = ? LIMIT 1`).get(scheduleId);
				return mapSchedule(row);
			});

			return tx(input);
		},

		async updateSchedule(input, actor) {
			const tx = sqlite.transaction((payload: typeof input) => {
				const row = sqlite.query(`SELECT * FROM schedules WHERE id = ? LIMIT 1`).get(payload.id) as any;
				if (!row) throw new Error('SCHEDULE_NOT_FOUND');
				if (String(row.created_by) !== String(actor.id)) throw new Error('FORBIDDEN');

				sqlite
					.query(
						`UPDATE schedules
						 SET title = ?, description = ?, location = ?,
							 year = ?, month = ?, day = ?,
							 start_at = ?, end_at = ?, duration_minutes = ?,
							 updated_at = datetime('now')
						 WHERE id = ?`
					)
					.run(
						payload.title,
						payload.description,
						payload.location,
						payload.year,
						payload.month,
						payload.day,
						payload.startAt,
						payload.endAt,
						payload.durationMinutes,
						payload.id
					);

				const next = sqlite.query(`SELECT * FROM schedules WHERE id = ? LIMIT 1`).get(payload.id);
				return mapSchedule(next);
			});

			return tx(input);
		},

		async replaceScheduleParticipants(input) {
			const tx = sqlite.transaction((payload: typeof input) => {
				sqlite.query(`DELETE FROM schedule_participants WHERE schedule_id = ?`).run(payload.scheduleId);
				const uniq = Array.from(new Set(payload.participantIds));
				for (const userId of uniq) {
					sqlite.query(`INSERT OR IGNORE INTO schedule_participants (schedule_id, user_id) VALUES (?, ?)`).run(payload.scheduleId, userId);
				}
			});
			tx(input);
		},

		async listSchedulesByMonth(input) {
			const rows = sqlite
				.query(`SELECT * FROM schedules WHERE year = ? AND month = ? ORDER BY day ASC, start_at ASC`)
				.all(input.year, input.month);
			return rows.map(mapSchedule);
		},
		async listSchedulesByDayForUser(input) {
			const rows = sqlite
				.query(
					`SELECT s.*
					 FROM schedules s
					 INNER JOIN schedule_participants sp ON sp.schedule_id = s.id
					 WHERE s.year = ? AND s.month = ? AND s.day = ? AND sp.user_id = ?
					 ORDER BY s.start_at ASC`
				)
				.all(input.year, input.month, input.day, input.userId);
			return rows.map(mapSchedule);
		},

		async listSchedulesByDateRangeForUser(input) {
			const rows = sqlite
				.query(
					`SELECT DISTINCT s.*
					 FROM schedules s
					 INNER JOIN schedule_participants sp ON sp.schedule_id = s.id
					 WHERE sp.user_id = ?
					   AND printf('%04d-%02d-%02d', s.year, s.month, s.day) >= ?
					   AND printf('%04d-%02d-%02d', s.year, s.month, s.day) <= ?
					 ORDER BY s.year ASC, s.month ASC, s.day ASC, s.start_at ASC`
				)
				.all(input.userId, input.startDate, input.endDate);
			return rows.map(mapSchedule);
		},

		async listScheduleParticipants(scheduleId) {
			const rows = sqlite
				.query(
					`SELECT sp.schedule_id, sp.user_id, u.username, u.avatar_path
					FROM schedule_participants sp
					INNER JOIN users u ON u.id = sp.user_id
					WHERE sp.schedule_id = ?
					ORDER BY u.username ASC`
				)
				.all(scheduleId);
			return rows.map(mapScheduleParticipant);
		},

		async searchUsersByUsername(keyword, limit = 8) {
			const rows = sqlite
				.query(`SELECT id, username, avatar_path FROM users WHERE username LIKE ? ORDER BY username ASC LIMIT ?`)
				.all(`%${keyword}%`, limit);
			return rows.map((r: any) => ({ id: String(r.id), username: String(r.username), avatarPath: r.avatar_path ?? null }));
		},

		async deleteSchedule(scheduleId, actor) {
			const tx = sqlite.transaction((id: string) => {
				const row = sqlite.query(`SELECT * FROM schedules WHERE id = ? LIMIT 1`).get(id) as any;
				if (!row) throw new Error('SCHEDULE_NOT_FOUND');
				if (String(row.created_by) !== String(actor.id)) throw new Error('FORBIDDEN');
				sqlite.query(`DELETE FROM schedules WHERE id = ?`).run(id);
			});
			tx(scheduleId);
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
