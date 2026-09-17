import type { Database } from 'bun:sqlite';

import type { HomeRepo } from '../contract';
import { mapHomeAnnouncementRow } from '../mappers';

export function createHomeRepo(sqlite: Database): HomeRepo {
	return {
		async listHomeAnnouncements(limit = 20) {
			const cap = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(100, Number(limit))) : 20;
			const rows = sqlite
				.query(
					`SELECT
						a.id,
						a.title,
						a.content_markdown,
						a.is_pinned,
						a.created_by,
						a.created_at,
						a.updated_at,
						u.username AS created_by_username
					FROM home_announcements a
					INNER JOIN users u ON u.id = a.created_by
					ORDER BY a.is_pinned DESC, a.created_at DESC
					LIMIT ?`
				)
				.all(cap);
			return rows.map(mapHomeAnnouncementRow);
		},
		async createHomeAnnouncement(input) {
			const r = sqlite.transaction((payload: typeof input) => {
				const inserted = sqlite
					.query(`INSERT INTO home_announcements (title, content_markdown, is_pinned, created_by) VALUES (?, ?, ?, ?)`)
					.run(payload.title, payload.contentMarkdown, payload.isPinned ? 1 : 0, payload.createdBy);

				sqlite
					.query(
						`DELETE FROM home_announcements
					 WHERE id IN (
					   SELECT id
					   FROM home_announcements
					   ORDER BY is_pinned DESC, created_at DESC
					   LIMIT -1 OFFSET 5
					 )`
					)
					.run();
				return inserted;
			})(input);
			const row = sqlite
				.query(
					`SELECT
						a.id,
						a.title,
						a.content_markdown,
						a.is_pinned,
						a.created_by,
						a.created_at,
						a.updated_at,
						u.username AS created_by_username
					FROM home_announcements a
					INNER JOIN users u ON u.id = a.created_by
					WHERE a.id = ? LIMIT 1`
				)
				.get(r.lastInsertRowid);
			if (!row) throw new Error('HOME_ANNOUNCEMENT_CREATE_FAILED');
			return mapHomeAnnouncementRow(row);
		},
		async setHomeAnnouncementPinned(input) {
			sqlite.query(`UPDATE home_announcements SET is_pinned = ?, updated_at = datetime('now') WHERE id = ?`).run(input.isPinned ? 1 : 0, input.id);
		},
		async deleteHomeAnnouncement(id) {
			sqlite.query(`DELETE FROM home_announcements WHERE id = ?`).run(id);
		},
	};
}
