import type { Database } from 'bun:sqlite';

import { JOINUS_PUBLIC_USERNAME } from '../../auth/joinusPublic';
import type { UsersRepo } from '../contract';
import { mapBirthdayWish, mapUser } from '../mappers';

export function createUsersRepo(sqlite: Database): UsersRepo {
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
			const rows = sqlite.query('SELECT * FROM users WHERE username != ? ORDER BY created_at DESC').all(JOINUS_PUBLIC_USERNAME);
			return rows.map(mapUser);
		},
		async updateUserStatus(userId, status) {
			sqlite.query("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, userId);
		},
		async deleteUser(userId) {
			const tx = sqlite.transaction((id: string) => {
				sqlite.query(`DELETE FROM recruitment_applications WHERE submitter_user_id = ?`).run(id);
				sqlite.query(`DELETE FROM recruitment_comment_likes WHERE user_id = ?`).run(id);
				sqlite.query(`DELETE FROM recruitment_comments WHERE author_id = ?`).run(id);
				sqlite.query(`DELETE FROM recruitment_application_tags WHERE created_by = ?`).run(id);
				sqlite.query(`DELETE FROM recruitment_application_ratings WHERE user_id = ?`).run(id);
				sqlite.query(`DELETE FROM schedule_participants WHERE user_id = ?`).run(id);
				sqlite.query(`DELETE FROM schedules WHERE created_by = ?`).run(id);
				sqlite.query(`DELETE FROM home_announcements WHERE created_by = ?`).run(id);
				sqlite.query(`DELETE FROM birthday_wishes WHERE recipient_user_id = ? OR author_user_id = ?`).run(id, id);
				sqlite.query(`DELETE FROM task_cards WHERE target_user_id = ?`).run(id);
				sqlite.query(`UPDATE task_cards SET actor_user_id = NULL WHERE actor_user_id = ?`).run(id);
				sqlite.query(`DELETE FROM users WHERE id = ?`).run(id);
			});
			tx(userId);
		},
		async searchUsersByUsername(keyword, limit = 8) {
			const rows = sqlite
				.query(`SELECT id, username, avatar_path FROM users WHERE username LIKE ? AND username != ? ORDER BY username ASC LIMIT ?`)
				.all(`%${keyword}%`, JOINUS_PUBLIC_USERNAME, limit);
			return rows.map((r: any) => ({ id: String(r.id), username: String(r.username), avatarPath: r.avatar_path ?? null }));
		},
		async listUsersByBirthday(input) {
			const rows = sqlite
				.query(
					`SELECT id, username, nickname, avatar_path
				FROM users
				WHERE status = 'active'
					AND birthday_month = ?
					AND birthday_day = ?
				ORDER BY role DESC, created_at ASC`
				)
				.all(input.month, input.day) as any[];

			return rows.map((r) => ({
				id: String(r.id),
				username: String(r.username),
				nickname: r.nickname ?? null,
				avatarPath: r.avatar_path ?? null,
			}));
		},

		async listBirthdayWishes(input) {
			const rows = sqlite
				.query(
					`SELECT
						w.id,
						w.message,
						w.created_at,
						u.id AS author_id,
						u.username AS author_username,
						u.nickname AS author_nickname,
						u.avatar_path AS author_avatar_path
					FROM birthday_wishes w
					INNER JOIN users u ON u.id = w.author_user_id
					WHERE w.recipient_user_id = ? AND w.wish_date = ?
					ORDER BY w.created_at ASC`
				)
				.all(input.recipientUserId, input.wishDate) as any[];

			return rows.map(mapBirthdayWish);
		},

		async createBirthdayWish(input) {
			const r = sqlite
				.query(
					`INSERT INTO birthday_wishes (recipient_user_id, author_user_id, message, wish_date)
						VALUES (?, ?, ?, ?)`
				)
				.run(input.recipientUserId, input.authorUserId, input.message, input.wishDate);

			const row = sqlite
				.query(
					`SELECT
						w.id,
						w.message,
						w.created_at,
						u.id AS author_id,
						u.username AS author_username,
						u.nickname AS author_nickname,
						u.avatar_path AS author_avatar_path
					FROM birthday_wishes w
					INNER JOIN users u ON u.id = w.author_user_id
					WHERE w.id = ?`
				)
				.get(r.lastInsertRowid) as any;

			return mapBirthdayWish(row);
		},

		async findBiliCookieByUserId(userId) {
			const row = sqlite.query(`SELECT bili_cookie FROM users WHERE id = ? LIMIT 1`).get(Number(userId)) as any;
			return row?.bili_cookie ?? null;
		},

		async findBiliCookieByUsername(username) {
			const row = sqlite
				.query(`SELECT bili_cookie FROM users WHERE username = ? AND bili_cookie IS NOT NULL AND bili_cookie != '' LIMIT 1`)
				.get(username) as any;
			return row?.bili_cookie ?? null;
		},

		async saveBiliBind(input) {
			sqlite
				.query(`UPDATE users SET bilibili_refresh_token = ?, bili_uid = ?, bili_cookie = ? WHERE id = ?`)
				.run(input.refreshToken, input.biliUid, input.cookies, Number(input.userId));
		},
	};
}
