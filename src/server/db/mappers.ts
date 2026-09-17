import type { Role } from '../types/auth';
import type { User } from '../types/user';
import type { AccountApplication } from '../types/application';
import type { BirthdayWish, HomeAnnouncement } from '../types/home';
import type { Schedule, ScheduleParticipant } from '../types/schedule';
import type { TaskCard, TaskSourceType, TaskStatus } from '../types/task';
import type {
	InterviewSlot,
	InterviewWindow,
	RecruitmentApplication,
	RecruitmentDepartment,
	RecruitmentComment,
	RecruitmentInterviewSlot,
} from '../types/recruitment';

/**
 * Row -> domain mappers. A raw `sqlite` row is snake_case and untyped,
 * so each mapper normalises the value into the domain shape.
 */

export function mapSchedule(row: any): Schedule {
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

export function mapScheduleParticipant(row: any): ScheduleParticipant {
	return {
		scheduleId: String(row.schedule_id),
		userId: String(row.user_id),
		username: row.username,
		avatarPath: row.avatar_path ?? null,
	};
}

export function mapUser(row: any): User {
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
		birthdayMonth: row.birthday_month == null ? null : Number(row.birthday_month),
		birthdayDay: row.birthday_day == null ? null : Number(row.birthday_day),
	};
}

export function mapApplication(row: any): AccountApplication {
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

export function mapBirthdayWish(row: any): BirthdayWish {
	return {
		id: String(row.id),
		message: String(row.message),
		createdAt: String(row.created_at),
		authorId: String(row.author_id),
		authorUsername: String(row.author_username),
		authorNickname: row.author_nickname ?? null,
		authorAvatarPath: row.author_avatar_path ?? null,
	};
}

export function mapRecruitmentApplication(row: any): RecruitmentApplication {
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
		offlineInterviewSlotId: row.offline_interview_slot_id == null ? null : Number(row.offline_interview_slot_id),
		wantsOnlineInterview: Boolean(row.wants_online_interview),
		onlineInterviewSlot: (row.online_interview_slot ?? null) as RecruitmentInterviewSlot | null,
		onlineInterviewSlotId: row.online_interview_slot_id == null ? null : Number(row.online_interview_slot_id),
		introMarkdown: String(row.intro_markdown),
		worksMarkdown: String(row.works_markdown),
		attachmentPath: row.attachment_path ?? null,
		createdAt: String(row.created_at),
		updatedAt: String(row.updated_at),
	};
}

export function mapInterviewWindow(row: any): InterviewWindow {
	return {
		id: String(row.id),
		date: String(row.date),
		startMin: Number(row.start_min),
		endMin: Number(row.end_min),
		createdAt: String(row.created_at),
		updatedAt: String(row.updated_at),
	};
}

export function mapInterviewSlot(row: any): InterviewSlot {
	return {
		id: String(row.id),
		windowId: String(row.window_id),
		date: String(row.date),
		startMin: Number(row.start_min),
		endMin: Number(row.end_min),
	};
}

export function mapRecruitmentCommentRow(row: any): RecruitmentComment {
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

export function mapHomeAnnouncementRow(row: any): HomeAnnouncement {
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

/** task_cards is read in several places; keep the column mapping in one spot */
export function mapTaskCard(row: any): TaskCard {
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
}
