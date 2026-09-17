import type { Database, SQLQueryBindings } from 'bun:sqlite';

import type { ApplicationsRepo } from '../contract';
import { mapApplication } from '../mappers';

export function createApplicationsRepo(sqlite: Database): ApplicationsRepo {
	return {
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
			if (patch.birthdayMonth !== undefined) {
				set.push('birthday_month = ?');
				vals.push(patch.birthdayMonth);
			}
			if (patch.birthdayDay !== undefined) {
				set.push('birthday_day = ?');
				vals.push(patch.birthdayDay);
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
	};
}
