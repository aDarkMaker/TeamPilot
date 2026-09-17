import type { Database } from 'bun:sqlite';

import type { Role } from '../../types/auth';
import type { RecruitmentRepo } from '../contract';
import { mapRecruitmentApplication, mapRecruitmentCommentRow } from '../mappers';

export function createRecruitmentRepo(sqlite: Database): RecruitmentRepo {
	return {
		async createRecruitmentApplication(input) {
			const r = sqlite
				.query(
					`INSERT INTO recruitment_applications (
						submitter_user_id, full_name, contact, qq, department, department_sort_order,
						is_student, school_college, grade,
						wants_offline_interview, offline_interview_slot,
						wants_online_interview, online_interview_slot,
						intro_markdown, works_markdown, attachment_path
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.run(
					input.submitterUserId,
					input.fullName,
					input.contact,
					input.qq,
					input.department,
					input.departmentSortOrder,
					input.isStudent ? 1 : 0,
					input.schoolCollege,
					input.grade,
					input.wantsOfflineInterview ? 1 : 0,
					input.offlineInterviewSlot,
					input.wantsOnlineInterview ? 1 : 0,
					input.onlineInterviewSlot,
					input.introMarkdown,
					input.worksMarkdown,
					input.attachmentPath
				);
			const row = sqlite.query(`SELECT * FROM recruitment_applications WHERE id = ?`).get(r.lastInsertRowid);
			return mapRecruitmentApplication(row);
		},

		async upsertRecruitmentApplicationByContact(input) {
			const contact = input.contact.trim();
			sqlite
				.query(
					`INSERT INTO recruitment_applications (
						submitter_user_id, full_name, contact, qq, department, department_sort_order,
						is_student, school_college, grade,
						wants_offline_interview, offline_interview_slot,
						wants_online_interview, online_interview_slot,
						intro_markdown, works_markdown, attachment_path
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(contact) DO UPDATE SET
						submitter_user_id = excluded.submitter_user_id,
						full_name = excluded.full_name,
						qq = excluded.qq,
						department = excluded.department,
						department_sort_order = excluded.department_sort_order,
						is_student = excluded.is_student,
						school_college = excluded.school_college,
						grade = excluded.grade,
						wants_offline_interview = excluded.wants_offline_interview,
						offline_interview_slot = excluded.offline_interview_slot,
						wants_online_interview = excluded.wants_online_interview,
						online_interview_slot = excluded.online_interview_slot,
						intro_markdown = excluded.intro_markdown,
						works_markdown = excluded.works_markdown,
						attachment_path = excluded.attachment_path,
						updated_at = datetime('now')`
				)
				.run(
					input.submitterUserId,
					input.fullName,
					contact,
					input.qq,
					input.department,
					input.departmentSortOrder,
					input.isStudent ? 1 : 0,
					input.schoolCollege,
					input.grade,
					input.wantsOfflineInterview ? 1 : 0,
					input.offlineInterviewSlot,
					input.wantsOnlineInterview ? 1 : 0,
					input.onlineInterviewSlot,
					input.introMarkdown,
					input.worksMarkdown,
					input.attachmentPath
				);
			const row = sqlite.query(`SELECT * FROM recruitment_applications WHERE contact = ? LIMIT 1`).get(contact);
			if (!row) throw new Error('UPSERT_RECRUITMENT_FAILED');
			return mapRecruitmentApplication(row);
		},

		async findRecruitmentApplicationByContact(contact) {
			const row = sqlite.query(`SELECT * FROM recruitment_applications WHERE contact = ? LIMIT 1`).get(String(contact).trim());
			return row ? mapRecruitmentApplication(row) : null;
		},

		async findRecruitmentApplicationByIdentityConflict(fullName, contact, qq) {
			const name = String(fullName).trim();
			const phone = String(contact).trim();
			const qqNum = String(qq).trim();
			const row = sqlite
				.query(
					`SELECT * FROM recruitment_applications
					WHERE full_name = ? OR contact = ? OR qq = ?
					ORDER BY
						CASE
							WHEN contact = ? THEN 0
							WHEN qq = ? THEN 1
							WHEN full_name = ? THEN 2
							ELSE 3
						END
					LIMIT 1`
				)
				.get(name, phone, qqNum, phone, qqNum, name);
			return row ? mapRecruitmentApplication(row) : null;
		},

		async updateRecruitmentApplicationById(id, input) {
			sqlite
				.query(
					`UPDATE recruitment_applications SET
						submitter_user_id = ?,
						full_name = ?,
						contact = ?,
						qq = ?,
						department = ?,
						department_sort_order = ?,
						is_student = ?,
						school_college = ?,
						grade = ?,
						wants_offline_interview = ?,
						offline_interview_slot = ?,
						wants_online_interview = ?,
						online_interview_slot = ?,
						intro_markdown = ?,
						works_markdown = ?,
						attachment_path = ?,
						updated_at = datetime('now')
					WHERE id = ?`
				)
				.run(
					input.submitterUserId,
					input.fullName,
					input.contact.trim(),
					input.qq,
					input.department,
					input.departmentSortOrder,
					input.isStudent ? 1 : 0,
					input.schoolCollege,
					input.grade,
					input.wantsOfflineInterview ? 1 : 0,
					input.offlineInterviewSlot,
					input.wantsOnlineInterview ? 1 : 0,
					input.onlineInterviewSlot,
					input.introMarkdown,
					input.worksMarkdown,
					input.attachmentPath,
					id
				);
			const row = sqlite.query(`SELECT * FROM recruitment_applications WHERE id = ? LIMIT 1`).get(id);
			if (!row) throw new Error('UPDATE_RECRUITMENT_FAILED');
			return mapRecruitmentApplication(row);
		},

		async listRecruitmentApplications(input) {
			const dir = input.timeOrder === 'asc' ? 'ASC' : 'DESC';
			const rows = sqlite.query(`SELECT * FROM recruitment_applications ORDER BY department_sort_order ASC, created_at ${dir}`).all();
			return rows.map(mapRecruitmentApplication);
		},

		async findRecruitmentApplicationById(id) {
			const row = sqlite.query(`SELECT * FROM recruitment_applications WHERE id = ? LIMIT 1`).get(id);
			return row ? mapRecruitmentApplication(row) : null;
		},

		async deleteRecruitmentApplicationById(id) {
			sqlite.query(`DELETE FROM recruitment_applications WHERE id = ?`).run(id);
		},

		async countRecruitmentApplicationsBySubmitter(submitterUserId) {
			const row = sqlite.query(`SELECT COUNT(*) AS c FROM recruitment_applications WHERE submitter_user_id = ?`).get(submitterUserId) as any;
			return Number(row?.c ?? 0);
		},

		async listRecruitmentApplicationTags(applicationId) {
			const rows = sqlite.query(`SELECT tag FROM recruitment_application_tags WHERE application_id = ? ORDER BY tag ASC`).all(applicationId);
			return rows.map((r: any) => String(r.tag));
		},

		async addRecruitmentApplicationTag(input) {
			sqlite
				.query(`INSERT OR REPLACE INTO recruitment_application_tags (application_id, tag, created_by) VALUES (?, ?, ?)`)
				.run(input.applicationId, input.tag, input.createdBy);
		},

		async removeRecruitmentApplicationTag(input) {
			sqlite.query(`DELETE FROM recruitment_application_tags WHERE application_id = ? AND tag = ?`).run(input.applicationId, input.tag);
		},

		async findRecruitmentTagCreatedBy(input) {
			const row = sqlite
				.query(`SELECT created_by FROM recruitment_application_tags WHERE application_id = ? AND tag = ? LIMIT 1`)
				.get(input.applicationId, input.tag) as any;
			return row?.created_by != null ? String(row.created_by) : null;
		},

		async listRecruitmentComments(applicationId, viewerUserId) {
			const rows = sqlite
				.query(
					`SELECT c.*, u.username AS author_username, u.role AS author_role,
						(SELECT COUNT(*) FROM recruitment_comment_likes l WHERE l.comment_id = c.id) AS like_count,
						EXISTS(SELECT 1 FROM recruitment_comment_likes lx WHERE lx.comment_id = c.id AND lx.user_id = ?) AS liked_by_me
					 FROM recruitment_comments c
					 INNER JOIN users u ON u.id = c.author_id
					 WHERE c.application_id = ?
					 ORDER BY c.created_at ASC`
				)
				.all(viewerUserId, applicationId);
			return rows.map(mapRecruitmentCommentRow);
		},

		async createRecruitmentComment(input) {
			const r = sqlite
				.query(`INSERT INTO recruitment_comments (application_id, author_id, body_markdown) VALUES (?, ?, ?)`)
				.run(input.applicationId, input.authorId, input.bodyMarkdown);
			const row = sqlite
				.query(
					`SELECT c.*, u.username AS author_username, u.role AS author_role,
						(SELECT COUNT(*) FROM recruitment_comment_likes l WHERE l.comment_id = c.id) AS like_count,
						EXISTS(SELECT 1 FROM recruitment_comment_likes lx WHERE lx.comment_id = c.id AND lx.user_id = ?) AS liked_by_me
					 FROM recruitment_comments c
					 INNER JOIN users u ON u.id = c.author_id
					 WHERE c.id = ?`
				)
				.get(input.authorId, r.lastInsertRowid);
			return mapRecruitmentCommentRow(row);
		},

		async updateRecruitmentComment(input) {
			const n = sqlite
				.query(`UPDATE recruitment_comments SET body_markdown = ?, updated_at = datetime('now') WHERE id = ? AND author_id = ?`)
				.run(input.bodyMarkdown, input.commentId, input.authorId).changes;
			if (!n) throw new Error('COMMENT_NOT_FOUND_OR_FORBIDDEN');
			const row = sqlite
				.query(
					`SELECT c.*, u.username AS author_username, u.role AS author_role,
						(SELECT COUNT(*) FROM recruitment_comment_likes l WHERE l.comment_id = c.id) AS like_count,
						EXISTS(SELECT 1 FROM recruitment_comment_likes lx WHERE lx.comment_id = c.id AND lx.user_id = ?) AS liked_by_me
					 FROM recruitment_comments c
					 INNER JOIN users u ON u.id = c.author_id
					 WHERE c.id = ?`
				)
				.get(input.authorId, input.commentId);
			return mapRecruitmentCommentRow(row);
		},

		async findRecruitmentCommentMeta(commentId) {
			const row = sqlite
				.query(
					`SELECT c.id, c.application_id, c.author_id, u.role AS author_role
					 FROM recruitment_comments c
					 INNER JOIN users u ON u.id = c.author_id
					 WHERE c.id = ? LIMIT 1`
				)
				.get(commentId) as any;
			if (!row) return null;
			return {
				id: String(row.id),
				applicationId: String(row.application_id),
				authorId: String(row.author_id),
				authorRole: row.author_role as Role,
			};
		},

		async deleteRecruitmentComment(commentId) {
			sqlite.query(`DELETE FROM recruitment_comments WHERE id = ?`).run(commentId);
		},

		async listRecruitmentRatingSummaries() {
			const rows = sqlite
				.query(
					`SELECT application_id, AVG(rating) AS rating_avg, COUNT(*) AS rating_count
					 FROM recruitment_application_ratings
					 GROUP BY application_id`
				)
				.all() as Array<{ application_id: number; rating_avg: number; rating_count: number }>;
			const map = new Map<string, { ratingAverage: number; ratingCount: number }>();
			for (const row of rows) {
				map.set(String(row.application_id), {
					ratingAverage: Number(row.rating_avg),
					ratingCount: Number(row.rating_count),
				});
			}
			return map;
		},

		async listRecruitmentRatingsByUser(userId) {
			const rows = sqlite.query(`SELECT application_id, rating FROM recruitment_application_ratings WHERE user_id = ?`).all(userId) as Array<{
				application_id: number;
				rating: number;
			}>;
			const map = new Map<string, number>();
			for (const row of rows) {
				map.set(String(row.application_id), Number(row.rating));
			}
			return map;
		},

		async getRecruitmentApplicationRatingSummary(applicationId) {
			const row = sqlite
				.query(
					`SELECT AVG(rating) AS rating_avg, COUNT(*) AS rating_count
					 FROM recruitment_application_ratings
					 WHERE application_id = ?`
				)
				.get(applicationId) as { rating_avg: number | null; rating_count: number } | undefined;
			const count = Number(row?.rating_count ?? 0);
			if (!count) return { ratingAverage: null, ratingCount: 0 };
			return { ratingAverage: Number(row?.rating_avg), ratingCount: count };
		},

		async upsertRecruitmentApplicationRating(input) {
			sqlite
				.query(
					`INSERT INTO recruitment_application_ratings (application_id, user_id, rating)
					 VALUES (?, ?, ?)
					 ON CONFLICT(application_id, user_id) DO UPDATE SET
					   rating = excluded.rating,
					   updated_at = datetime('now')`
				)
				.run(input.applicationId, input.userId, input.rating);
			const summary = await this.getRecruitmentApplicationRatingSummary(input.applicationId);
			return { ...summary, myRating: input.rating };
		},

		async toggleRecruitmentCommentLike(input) {
			const likeCount = sqlite.transaction(() => {
				const exists = sqlite
					.query(`SELECT 1 FROM recruitment_comment_likes WHERE comment_id = ? AND user_id = ?`)
					.get(input.commentId, input.userId);
				if (exists) {
					sqlite.query(`DELETE FROM recruitment_comment_likes WHERE comment_id = ? AND user_id = ?`).run(input.commentId, input.userId);
				} else {
					sqlite.query(`INSERT INTO recruitment_comment_likes (comment_id, user_id) VALUES (?, ?)`).run(input.commentId, input.userId);
				}
				const cnt = sqlite.query(`SELECT COUNT(*) AS c FROM recruitment_comment_likes WHERE comment_id = ?`).get(input.commentId) as any;
				return Number(cnt?.c ?? 0);
			})();
			const liked = Boolean(
				sqlite.query(`SELECT 1 FROM recruitment_comment_likes WHERE comment_id = ? AND user_id = ?`).get(input.commentId, input.userId)
			);
			return { liked, likeCount };
		},
	};
}
