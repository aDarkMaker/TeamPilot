import type { Database, SQLQueryBindings } from 'bun:sqlite';
import type Redis from 'ioredis';
import { JOINUS_PUBLIC_USERNAME } from './auth/joinusPublic';
import type { Role, UserStatus } from './types/auth';
import type { User } from './types/user';
import type { AccountApplication } from './types/application';
import type { Schedule, ScheduleParticipant } from './types/schedule';
import type { HomeAnnouncement } from './types/home';
import type {
	RecruitmentApplication,
	RecruitmentComment,
	RecruitmentDepartment,
	RecruitmentInterviewSlot,
} from './types/recruitment';
import type { TaskCard, TaskSourceType, TaskStatus } from './types/task';

export interface DB {
	findUserByUsername(username: string): Promise<User | null>;
	findUserById(id: string): Promise<User | null>;
	createUser(input: { username: string; passwordHash: string; role: Role; status: UserStatus }): Promise<User>;
	updateUserRole(userId: string, role: Role): Promise<void>;
	listUsers(): Promise<User[]>;
	updateUserStatus(userId: string, status: UserStatus): Promise<void>;
	deleteUser(userId: string): Promise<void>;
	listUsersByBirthday(input: { month: number; day: number }): Promise<Array<{ id: string; username: string; nickname: string | null; avatarPath: string | null }>>;
	listBirthdayWishes(input: { recipientUserId: string; wishDate: string }): Promise<
		Array<{ id: string; message: string; createdAt: string; authorId: string; authorUsername: string; authorNickname: string | null; authorAvatarPath: string | null }>
	>;
	createBirthdayWish(input: { recipientUserId: string; authorUserId: string; message: string; wishDate: string }): Promise<
		{ id: string; message: string; createdAt: string; authorId: string; authorUsername: string; authorNickname: string | null; authorAvatarPath: string | null }
	>;

	listTaskCardsByUser(input: {
		targetUserId: string;
		status?: TaskStatus;
		limit?: number;
		offset?: number;
	}): Promise<TaskCard[]>;

	countPendingTaskCardsByUser(targetUserId: string): Promise<number>;

	createOrReplaceTaskCard(input: {
		targetUserId: string;
		actorUserId: string | null;
		sourceType: TaskSourceType;
		sourceId: string;
		title: string;
		content?: string | null;
		payloadJson?: string | null;
	}): Promise<TaskCard>;

	decideTaskCard(input: {
		taskId: string;
		targetUserId: string;
		status: Extract<TaskStatus, 'accepted' | 'leave'>;
	}): Promise<TaskCard>;
	listTaskCardsBySource(input: { sourceType: TaskSourceType; sourceId: string }): Promise<TaskCard[]>;
	pruneTaskCardsBySourceTargets(input: { sourceType: TaskSourceType; sourceId: string; keepTargetUserIds: string[] }): Promise<void>;
	deleteTaskCardsBySource(input: { sourceType: TaskSourceType; sourceId: string }): Promise<void>;

	createSchedule(input: {
		title: string;
		description: string | null;
		location: string | null;
		isAll: boolean;
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
	findScheduleById(scheduleId: string): Promise<Schedule | null>;
	
	listAllSchedulesFromDate(input: { startDate: string }): Promise<Schedule[]>;

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
			birthdayMonth?: number | null;
			birthdayDay?: number | null;
		}
	): Promise<void>;
	updateUserPasswordHash(userId: string, passwordHash: string): Promise<void>;

	listHomeAnnouncements(limit?: number): Promise<HomeAnnouncement[]>;
	createHomeAnnouncement(input: { title: string; contentMarkdown: string; isPinned: boolean; createdBy: string }): Promise<HomeAnnouncement>;
	setHomeAnnouncementPinned(input: { id: string; isPinned: boolean }): Promise<void>;
	deleteHomeAnnouncement(id: string): Promise<void>;

	createRecruitmentApplication(input: {
		submitterUserId: string;
		fullName: string;
		contact: string;
		qq: string;
		department: RecruitmentDepartment;
		departmentSortOrder: number;
		isStudent: boolean;
		schoolCollege: string | null;
		grade: string | null;
		wantsOfflineInterview: boolean;
		offlineInterviewSlot: RecruitmentInterviewSlot | null;
		wantsOnlineInterview: boolean;
		onlineInterviewSlot: RecruitmentInterviewSlot | null;
		introMarkdown: string;
		worksMarkdown: string;
		attachmentPath: string | null;
	}): Promise<RecruitmentApplication>;

	upsertRecruitmentApplicationByContact(input: {
		submitterUserId: string;
		fullName: string;
		contact: string;
		qq: string;
		department: RecruitmentDepartment;
		departmentSortOrder: number;
		isStudent: boolean;
		schoolCollege: string | null;
		grade: string | null;
		wantsOfflineInterview: boolean;
		offlineInterviewSlot: RecruitmentInterviewSlot | null;
		wantsOnlineInterview: boolean;
		onlineInterviewSlot: RecruitmentInterviewSlot | null;
		introMarkdown: string;
		worksMarkdown: string;
		attachmentPath: string | null;
	}): Promise<RecruitmentApplication>;

	findRecruitmentApplicationByContact(contact: string): Promise<RecruitmentApplication | null>;

	listRecruitmentApplications(input: { timeOrder: 'asc' | 'desc' }): Promise<RecruitmentApplication[]>;

	findRecruitmentApplicationById(id: string): Promise<RecruitmentApplication | null>;
	deleteRecruitmentApplicationById(id: string): Promise<void>;

	countRecruitmentApplicationsBySubmitter(submitterUserId: string): Promise<number>;

	listRecruitmentApplicationTags(applicationId: string): Promise<string[]>;

	addRecruitmentApplicationTag(input: { applicationId: string; tag: string; createdBy: string }): Promise<void>;

	removeRecruitmentApplicationTag(input: { applicationId: string; tag: string }): Promise<void>;

	findRecruitmentTagCreatedBy(input: { applicationId: string; tag: string }): Promise<string | null>;

	listRecruitmentComments(applicationId: string, viewerUserId: string): Promise<RecruitmentComment[]>;

	createRecruitmentComment(input: { applicationId: string; authorId: string; bodyMarkdown: string }): Promise<RecruitmentComment>;

	updateRecruitmentComment(input: { commentId: string; authorId: string; bodyMarkdown: string }): Promise<RecruitmentComment>;

	findRecruitmentCommentMeta(
		commentId: string,
	): Promise<{ id: string; applicationId: string; authorId: string; authorRole: Role } | null>;

	deleteRecruitmentComment(commentId: string): Promise<void>;

	toggleRecruitmentCommentLike(input: { commentId: string; userId: string }): Promise<{ liked: boolean; likeCount: number }>;
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
		isAll: Boolean(row.is_all),
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
		birthdayMonth: row.birthday_month == null ? null: Number(row.birthday_month),
		birthdayDay: row.birthday_day == null ? null: Number(row.birthday_day),
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

function mapRecruitmentApplication(row: any): RecruitmentApplication {
	return {
		id: String(row.id),
		submitterUserId: String(row.submitter_user_id),
		fullName: String(row.full_name),
		contact: String(row.contact),
		qq: String(row.qq),
		department: row.department as RecruitmentDepartment,
		departmentSortOrder: Number(row.department_sort_order),
		isStudent: Boolean(row.is_student),
		schoolCollege: row.school_college ?? null,
		grade: row.grade ?? null,
		wantsOfflineInterview: Boolean(row.wants_offline_interview),
		offlineInterviewSlot: (row.offline_interview_slot ?? null) as RecruitmentInterviewSlot | null,
		wantsOnlineInterview: Boolean(row.wants_online_interview),
		onlineInterviewSlot: (row.online_interview_slot ?? null) as RecruitmentInterviewSlot | null,
		introMarkdown: String(row.intro_markdown),
		worksMarkdown: String(row.works_markdown),
		attachmentPath: row.attachment_path ?? null,
		createdAt: String(row.created_at),
		updatedAt: String(row.updated_at),
	};
}

function mapRecruitmentCommentRow(row: any): RecruitmentComment {
	return {
		id: String(row.id),
		applicationId: String(row.application_id),
		authorId: String(row.author_id),
		authorUsername: String(row.author_username),
		authorRole: row.author_role as Role,
		bodyMarkdown: String(row.body_markdown),
		createdAt: String(row.created_at),
		updatedAt: String(row.updated_at),
		likeCount: Number(row.like_count ?? 0),
		likedByMe: Boolean(row.liked_by_me),
	};
}

function mapHomeAnnouncementRow(row: any): HomeAnnouncement {
	return {
		id: String(row.id),
		title: String(row.title),
		contentMarkdown: String(row.content_markdown),
		isPinned: Boolean(row.is_pinned),
		createdBy: String(row.created_by),
		createdByUsername: String(row.created_by_username),
		createdAt: String(row.created_at),
		updatedAt: String(row.updated_at),
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
			const rows = sqlite
				.query('SELECT * FROM users WHERE username != ? ORDER BY created_at DESC')
				.all(JOINUS_PUBLIC_USERNAME);
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
					LIMIT ?`,
				)
				.all(cap);
			return rows.map(mapHomeAnnouncementRow);
		},
		async createHomeAnnouncement(input) {
			const r = sqlite.transaction((payload: typeof input) => {
				const inserted = sqlite
					.query(`INSERT INTO home_announcements (title, content_markdown, is_pinned, created_by) VALUES (?, ?, ?, ?)`)
					.run(payload.title, payload.contentMarkdown, payload.isPinned ? 1 : 0, payload.createdBy);

				sqlite.query(
					`DELETE FROM home_announcements
					 WHERE id IN (
					   SELECT id
					   FROM home_announcements
					   ORDER BY is_pinned DESC, created_at DESC
					   LIMIT -1 OFFSET 5
					 )`,
				).run();
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
					WHERE a.id = ? LIMIT 1`,
				)
				.get(r.lastInsertRowid);
			if (!row) throw new Error('HOME_ANNOUNCEMENT_CREATE_FAILED');
			return mapHomeAnnouncementRow(row);
		},
		async setHomeAnnouncementPinned(input) {
			sqlite
				.query(`UPDATE home_announcements SET is_pinned = ?, updated_at = datetime('now') WHERE id = ?`)
				.run(input.isPinned ? 1 : 0, input.id);
		},
		async deleteHomeAnnouncement(id) {
			sqlite.query(`DELETE FROM home_announcements WHERE id = ?`).run(id);
		},
		async createSchedule(input) {
			const tx = sqlite.transaction((payload: typeof input) => {
				const result = sqlite
					.query(
						`INSERT INTO schedules
							(title, description, location, is_all, year, month, day, start_at, end_at, duration_minutes, created_by)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.run(
						payload.title,
						payload.description,
						payload.location,
						payload.isAll ? 1 : 0,
						payload.year,
						payload.month,
						payload.day,
						payload.startAt,
						payload.endAt,
						payload.durationMinutes,
						payload.createdBy,
					);
				
				const scheduleId = String(result.lastInsertRowid);

				if (!payload.isAll) {
					const uniq = Array.from(new Set(payload.participantIds));
					for (const userId of uniq) {
						sqlite
							.query(`INSERT OR IGNORE INTO schedule_participants (schedule_id, user_id) VALUES (?, ?)`)
							.run(scheduleId, userId);
					}
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
					 LEFT JOIN schedule_participants sp ON sp.schedule_id = s.id
					 WHERE s.year = ? AND s.month = ? AND s.day = ?
					   AND (s.is_all = 1 OR sp.user_id = ?)
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
					 LEFT JOIN schedule_participants sp ON sp.schedule_id = s.id
					 WHERE (s.is_all = 1 OR sp.user_id = ?)
					   AND printf('%04d-%02d-%02d', s.year, s.month, s.day) >= ?
					   AND printf('%04d-%02d-%02d', s.year, s.month, s.day) <= ?
					 ORDER BY s.year ASC, s.month ASC, s.day ASC, s.start_at ASC`
				)
				.all(input.userId, input.startDate, input.endDate);
			return rows.map(mapSchedule);
		},

		async listAllSchedulesFromDate(input) {
			const rows = sqlite
				.query(
					`SELECT s.*
					 FROM schedules s
					 WHERE s.is_all = 1
					   AND printf('%04d-%02d-%02d', s.year, s.month, s.day) >= ?
					 ORDER BY s.year ASC, s.month ASC, s.day ASC, s.start_at ASC`,
				)
				.all(input.startDate);
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

		async findScheduleById(scheduleId) {
			const row = sqlite.query(`SELECT * FROM schedules WHERE id = ? LIMIT 1`).get(scheduleId);
			return row ? mapSchedule(row) : null;
		},

		async searchUsersByUsername(keyword, limit = 8) {
			const rows = sqlite
				.query(
					`SELECT id, username, avatar_path FROM users WHERE username LIKE ? AND username != ? ORDER BY username ASC LIMIT ?`,
				)
				.all(`%${keyword}%`, JOINUS_PUBLIC_USERNAME, limit);
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

		async createRecruitmentApplication(input) {
			const r = sqlite
				.query(
					`INSERT INTO recruitment_applications (
						submitter_user_id, full_name, contact, qq, department, department_sort_order,
						is_student, school_college, grade,
						wants_offline_interview, offline_interview_slot,
						wants_online_interview, online_interview_slot,
						intro_markdown, works_markdown, attachment_path
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
					input.attachmentPath,
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
						updated_at = datetime('now')`,
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
					input.attachmentPath,
				);
			const row = sqlite.query(`SELECT * FROM recruitment_applications WHERE contact = ? LIMIT 1`).get(contact);
			if (!row) throw new Error('UPSERT_RECRUITMENT_FAILED');
			return mapRecruitmentApplication(row);
		},

		async findRecruitmentApplicationByContact(contact) {
			const row = sqlite
				.query(`SELECT * FROM recruitment_applications WHERE contact = ? LIMIT 1`)
				.get(String(contact).trim());
			return row ? mapRecruitmentApplication(row) : null;
		},

		async listRecruitmentApplications(input) {
			const dir = input.timeOrder === 'asc' ? 'ASC' : 'DESC';
			const rows = sqlite
				.query(`SELECT * FROM recruitment_applications ORDER BY department_sort_order ASC, created_at ${dir}`)
				.all();
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
			const row = sqlite
				.query(`SELECT COUNT(*) AS c FROM recruitment_applications WHERE submitter_user_id = ?`)
				.get(submitterUserId) as any;
			return Number(row?.c ?? 0);
		},

		async listRecruitmentApplicationTags(applicationId) {
			const rows = sqlite
				.query(`SELECT tag FROM recruitment_application_tags WHERE application_id = ? ORDER BY tag ASC`)
				.all(applicationId);
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
					 ORDER BY c.created_at ASC`,
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
					 WHERE c.id = ?`,
				)
				.get(input.authorId, r.lastInsertRowid);
			return mapRecruitmentCommentRow(row);
		},

		async updateRecruitmentComment(input) {
			const n = sqlite
				.query(
					`UPDATE recruitment_comments SET body_markdown = ?, updated_at = datetime('now') WHERE id = ? AND author_id = ?`,
				)
				.run(input.bodyMarkdown, input.commentId, input.authorId).changes;
			if (!n) throw new Error('COMMENT_NOT_FOUND_OR_FORBIDDEN');
			const row = sqlite
				.query(
					`SELECT c.*, u.username AS author_username, u.role AS author_role,
						(SELECT COUNT(*) FROM recruitment_comment_likes l WHERE l.comment_id = c.id) AS like_count,
						EXISTS(SELECT 1 FROM recruitment_comment_likes lx WHERE lx.comment_id = c.id AND lx.user_id = ?) AS liked_by_me
					 FROM recruitment_comments c
					 INNER JOIN users u ON u.id = c.author_id
					 WHERE c.id = ?`,
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
					 WHERE c.id = ? LIMIT 1`,
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
				const cnt = sqlite
					.query(`SELECT COUNT(*) AS c FROM recruitment_comment_likes WHERE comment_id = ?`)
					.get(input.commentId) as any;
				return Number(cnt?.c ?? 0);
			})();
			const liked = Boolean(
				sqlite.query(`SELECT 1 FROM recruitment_comment_likes WHERE comment_id = ? AND user_id = ?`).get(input.commentId, input.userId),
			);
			return { liked, likeCount };
		},

		async listUsersByBirthday(input) {
			const rows = sqlite
				.query(
					`SELECT id, username, nickname, avatar_path
				FROM users
				WHERE status = 'active'
					AND birthday_month = ?
					AND birthday_day = ?
				ORDER BY role DESC, created_at ASC`,
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
					ORDER BY w.created_at ASC`,
				)
				.all(input.recipientUserId, input.wishDate) as any[];
			
			return rows.map((r) => ({
				id: String(r.id),
				message: String(r.message),
				createdAt: String(r.created_at),
				authorId: String(r.author_id),
				authorUsername: String(r.author_username),
				authorNickname: r.author_nickname ?? null,
				authorAvatarPath: r.author_avatar_path ?? null,
			}));
		},

		async createBirthdayWish(input) {
			const r = sqlite
				.query(
					`INSERT INTO birthday_wishes (recipient_user_id, author_user_id, message, wish_date)
						VALUES (?, ?, ?, ?)`,
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
					WHERE w.id = ?`,
				)
				.get(r.lastInsertRowid) as any;

			return {
				id: String(row.id),
				message: String(row.message),
				createdAt: String(row.created_at),
				authorId: String(row.author_id),
				authorUsername: String(row.author_username),
				authorNickname: row.author_nickname ?? null,
				authorAvatarPath: row.author_avatar_path ?? null,
			};
		},

		async listTaskCardsByUser(input) {
			const limit = Math.max(1, Math.min(100, Number(input.limit ?? 20)));
			const offset = Math.max(0, Number(input.offset ?? 0));

			const where: string[] = ['target_user_id = ?'];
			const bindings: SQLQueryBindings[] = [input.targetUserId];

			if (input.status) {
				where.push('status = ?');
				bindings.push(input.status);
			}

			const rows = sqlite
				.query(
					`SELECT
						id,
						target_user_id,
						actor_user_id,
						source_type,
						source_id,
						title,
						content,
						payload_json,
						status,
						decided_at,
						created_at,
						updated_at
					FROM task_cards
					WHERE ${where.join(' AND ')}
					ORDER BY created_at DESC
					LIMIT ? OFFSET ?`,
				)
				.all(...bindings, limit, offset) as any[];
			
			return rows.map((r) => ({
				id: String(r.id),
				targetUserId: String(r.target_user_id),
				actorUserId: r.actor_user_id == null ? null : String(r.actor_user_id),
				sourceType: String(r.source_type) as TaskSourceType,
				sourceId: String(r.source_id),
				title: String(r.title),
				content: r.content ?? null,
				payloadJson: r.payload_json ?? null,
				status: String(r.status) as TaskStatus,
				decidedAt: r.decided_at ?? null,
				createdAt: String(r.created_at),
				updatedAt: String(r.updated_at),
			}));
		},

		async countPendingTaskCardsByUser(targetUserId) {
			const row = sqlite
				.query(`SELECT COUNT(*) AS c FROM task_cards WHERE target_user_id = ? AND status = 'pending'`)
				.get(targetUserId) as any;
			return Number(row?.c ?? 0);
		},

		async createOrReplaceTaskCard(input) {
			sqlite
				.query(
					`INSERT INTO task_cards (
						target_user_id, actor_user_id, source_type, source_id, title, content, payload_json, status
					) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
					ON CONFLICT(target_user_id, source_type, source_id) DO UPDATE SET
						actor_user_id = excluded.actor_user_id,
						title = excluded.title,
						content = excluded.content,
						payload_json = excluded.payload_json,
						updated_at = datetime('now')`,
				)
				.run(
					input.targetUserId,
					input.actorUserId,
					input.sourceType,
					input.sourceId,
					input.title,
					input.content ?? null,
					input.payloadJson ?? null,
				);

			const row = sqlite
				.query(
					`SELECT
						id,
						target_user_id,
						actor_user_id,
						source_type,
						source_id,
						title,
						content,
						payload_json,
						status,
						decided_at,
						created_at,
						updated_at
					FROM task_cards
					WHERE target_user_id = ? AND source_type = ? AND source_id = ?
					LIMIT 1`,
				)
				.get(input.targetUserId, input.sourceType, input.sourceId) as any;
			
			return {
				id: String(row.id),
				targetUserId: String(row.target_user_id),
				actorUserId: row.actor_user_id == null ? null : String(row.actor_user_id),
				sourceType: String(row.source_type) as TaskSourceType,
				sourceId: String(row.source_id),
				title: String(row.title),
				content: row.content ?? null,
				payloadJson: row.payload_json ?? null,
				status: String(row.status) as TaskStatus,
				decidedAt: row.decided_at ?? null,
				createdAt: String(row.created_at),
				updatedAt: String(row.updated_at),
			};
		},

		async decideTaskCard(input) {
			const tx = sqlite.transaction((payload: typeof input) => {
				const row = sqlite
					.query(`SELECT id, target_user_id, status FROM task_cards WHERE id = ? LIMIT 1`)
					.get(payload.taskId) as any;
				if (!row) throw new Error('TASK_NOT_FOUND');
				if (String(row.target_user_id) !== String(payload.targetUserId)) throw new Error('FORBIDDEN');
				
				sqlite
					.query(
						`UPDATE task_cards
						SET status = ?, decided_at = datetime('now'), updated_at = datetime('now')
						WHERE id = ?`,
					)
					.run(payload.status, payload.taskId);

				const next = sqlite
					.query(
						`SELECT
							id,
							target_user_id,
							actor_user_id,
							source_type,
							source_id,
							title,
							content,
							payload_json,
							status,
							decided_at,
							created_at,
							updated_at
						FROM task_cards WHERE id = ? LIMIT 1`,
					)
					.get(payload.taskId) as any;
				
				return next;
			});

			const row = tx(input);

			return {
				id: String(row.id),
				targetUserId: String(row.target_user_id),
				actorUserId: row.actor_user_id == null ? null : String(row.actor_user_id),
				sourceType: String(row.source_type) as TaskSourceType,
				sourceId: String(row.source_id),
				title: String(row.title),
				content: row.content ?? null,
				payloadJson: row.payload_json ?? null,
				status: String(row.status) as TaskStatus,
				decidedAt: row.decided_at ?? null,
				createdAt: String(row.created_at),
				updatedAt: String(row.updated_at),
			};
		},

		async listTaskCardsBySource(input) {
			const rows = sqlite
				.query(
					`SELECT
						id,
						target_user_id,
						actor_user_id,
						source_type,
						source_id,
						title,
						content,
						payload_json,
						status,
						decided_at,
						created_at,
						updated_at
					FROM task_cards
					WHERE source_type = ? AND source_id = ?
					ORDER BY created_at DESC`,
				)
				.all(input.sourceType, input.sourceId) as any[];
			return rows.map((r) => ({
				id: String(r.id),
				targetUserId: String(r.target_user_id),
				actorUserId: r.actor_user_id == null ? null : String(r.actor_user_id),
				sourceType: String(r.source_type) as TaskSourceType,
				sourceId: String(r.source_id),
				title: String(r.title),
				content: r.content ?? null,
				payloadJson: r.payload_json ?? null,
				status: String(r.status) as TaskStatus,
				decidedAt: r.decided_at ?? null,
				createdAt: String(r.created_at),
				updatedAt: String(r.updated_at),
			}));
		},

		async pruneTaskCardsBySourceTargets(input) {
			const keep = Array.from(new Set(input.keepTargetUserIds)).filter(Boolean);
			if (keep.length === 0) {
				sqlite
					.query(`DELETE FROM task_cards WHERE source_type = ? AND source_id = ?`)
					.run(input.sourceType, input.sourceId);
				return;
			}
			const placeholders = keep.map(() => '?').join(', ');
			sqlite
				.query(
					`DELETE FROM task_cards
					 WHERE source_type = ? AND source_id = ?
					   AND target_user_id NOT IN (${placeholders})`,
				)
				.run(input.sourceType, input.sourceId, ...keep);
		},

		async deleteTaskCardsBySource(input) {
			sqlite
				.query(`DELETE FROM task_cards WHERE source_type = ? AND source_id = ?`)
				.run(input.sourceType, input.sourceId);
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
