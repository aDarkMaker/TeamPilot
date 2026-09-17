import type { Role, UserStatus } from '../types/auth';
import type { User, UserBirthdayBrief, UserSearchBrief } from '../types/user';
import type { AccountApplication } from '../types/application';
import type { BirthdayWish, HomeAnnouncement } from '../types/home';
import type { Schedule, ScheduleParticipant } from '../types/schedule';
import type {
	InterviewSlot,
	InterviewSlotListItem,
	InterviewWindow,
	RecruitmentApplication,
	RecruitmentApplicationRatingAggregate,
	RecruitmentApplicationRatingSummary,
	RecruitmentApplicationWriteInput,
	RecruitmentBookingWriteInput,
	RecruitmentComment,
	RecruitmentCommentMeta,
	RecruitmentRatingTotals,
} from '../types/recruitment';
import type { TaskCard, TaskSourceType, TaskStatus } from '../types/task';

export interface DB {
	findUserByUsername(username: string): Promise<User | null>;
	findUserById(id: string): Promise<User | null>;
	createUser(input: { username: string; passwordHash: string; role: Role; status: UserStatus }): Promise<User>;
	updateUserRole(userId: string, role: Role): Promise<void>;
	listUsers(): Promise<User[]>;
	updateUserStatus(userId: string, status: UserStatus): Promise<void>;
	deleteUser(userId: string): Promise<void>;
	listUsersByBirthday(input: { month: number; day: number }): Promise<UserBirthdayBrief[]>;
	listBirthdayWishes(input: { recipientUserId: string; wishDate: string }): Promise<BirthdayWish[]>;
	createBirthdayWish(input: { recipientUserId: string; authorUserId: string; message: string; wishDate: string }): Promise<BirthdayWish>;

	findBiliCookieByUserId(userId: string): Promise<string | null>;
	findBiliCookieByUsername(username: string): Promise<string | null>;
	saveBiliBind(input: { userId: string; refreshToken: string; biliUid: string; cookies: string }): Promise<void>;

	listTaskCardsByUser(input: { targetUserId: string; status?: TaskStatus; limit?: number; offset?: number }): Promise<TaskCard[]>;

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

	decideTaskCard(input: { taskId: string; targetUserId: string; status: Extract<TaskStatus, 'accepted' | 'leave'> }): Promise<TaskCard>;
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

	searchUsersByUsername(keyword: string, limit?: number): Promise<UserSearchBrief[]>;
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

	createRecruitmentApplication(input: RecruitmentApplicationWriteInput): Promise<RecruitmentApplication>;

	upsertRecruitmentApplicationByContact(input: RecruitmentApplicationWriteInput): Promise<RecruitmentApplication>;

	findRecruitmentApplicationByContact(contact: string): Promise<RecruitmentApplication | null>;

	findRecruitmentApplicationByIdentityConflict(fullName: string, contact: string, qq: string): Promise<RecruitmentApplication | null>;

	updateRecruitmentApplicationById(id: string, input: RecruitmentApplicationWriteInput): Promise<RecruitmentApplication>;

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

	findRecruitmentCommentMeta(commentId: string): Promise<RecruitmentCommentMeta | null>;

	deleteRecruitmentComment(commentId: string): Promise<void>;

	toggleRecruitmentCommentLike(input: { commentId: string; userId: string }): Promise<{ liked: boolean; likeCount: number }>;

	listRecruitmentRatingSummaries(): Promise<Map<string, RecruitmentRatingTotals>>;

	listRecruitmentRatingsByUser(userId: string): Promise<Map<string, number>>;

	upsertRecruitmentApplicationRating(input: {
		applicationId: string;
		userId: string;
		rating: number;
	}): Promise<RecruitmentApplicationRatingAggregate>;

	getRecruitmentApplicationRatingSummary(applicationId: string): Promise<RecruitmentApplicationRatingSummary>;

	listInterviewWindows(): Promise<InterviewWindow[]>;
	createInterviewWindowWithSlots(input: { date: string; startMin: number; endMin: number }): Promise<InterviewWindow>;
	deleteInterviewWindow(windowId: string): Promise<void>;
	listInterviewSlotsWithBooked(): Promise<InterviewSlotListItem[]>;
	findInterviewSlotsByIds(ids: number[]): Promise<InterviewSlot[]>;
	bookRecruitmentApplication(input: {
		application: RecruitmentBookingWriteInput;
		existingId: string | null;
		offlineSlotId: number | null;
		onlineSlotId: number | null;
	}): Promise<RecruitmentApplication>;
}

export interface Cache {
	get(key: string): Promise<string | null>;
	setex(key: string, ttlSeconds: number, value: string): Promise<'OK' | null>;
	del(key: string): Promise<number>;
	incr(key: string): Promise<number>;
	expire(key: string, seconds: number): Promise<number>;
}

/**
 * The contract is sliced per module under ./repos.
 * Each `createXxxRepo` returns one slice, and the composition root in index.ts spreads them into a DB.
 */
export type UsersRepo = Pick<
	DB,
	| 'findUserByUsername'
	| 'findUserById'
	| 'createUser'
	| 'updateUserRole'
	| 'listUsers'
	| 'updateUserStatus'
	| 'deleteUser'
	| 'searchUsersByUsername'
	| 'listUsersByBirthday'
	| 'listBirthdayWishes'
	| 'createBirthdayWish'
	| 'findBiliCookieByUserId'
	| 'findBiliCookieByUsername'
	| 'saveBiliBind'
>;

export type ApplicationsRepo = Pick<
	DB,
	| 'createAccountApplication'
	| 'findApplicationById'
	| 'findPendingApplications'
	| 'setApplicationReview'
	| 'updateUserProfile'
	| 'updateUserPasswordHash'
>;

export type HomeRepo = Pick<
	DB,
	'listHomeAnnouncements' | 'createHomeAnnouncement' | 'setHomeAnnouncementPinned' | 'deleteHomeAnnouncement'
>;

export type SchedulesRepo = Pick<
	DB,
	| 'createSchedule'
	| 'updateSchedule'
	| 'replaceScheduleParticipants'
	| 'listSchedulesByMonth'
	| 'listSchedulesByDayForUser'
	| 'listSchedulesByDateRangeForUser'
	| 'listAllSchedulesFromDate'
	| 'listScheduleParticipants'
	| 'findScheduleById'
	| 'deleteSchedule'
>;

export type RecruitmentRepo = Pick<
	DB,
	| 'createRecruitmentApplication'
	| 'upsertRecruitmentApplicationByContact'
	| 'findRecruitmentApplicationByContact'
	| 'findRecruitmentApplicationByIdentityConflict'
	| 'updateRecruitmentApplicationById'
	| 'listRecruitmentApplications'
	| 'findRecruitmentApplicationById'
	| 'deleteRecruitmentApplicationById'
	| 'countRecruitmentApplicationsBySubmitter'
	| 'listRecruitmentApplicationTags'
	| 'addRecruitmentApplicationTag'
	| 'removeRecruitmentApplicationTag'
	| 'findRecruitmentTagCreatedBy'
	| 'listRecruitmentComments'
	| 'createRecruitmentComment'
	| 'updateRecruitmentComment'
	| 'findRecruitmentCommentMeta'
	| 'deleteRecruitmentComment'
	| 'listRecruitmentRatingSummaries'
	| 'listRecruitmentRatingsByUser'
	| 'getRecruitmentApplicationRatingSummary'
	| 'upsertRecruitmentApplicationRating'
	| 'toggleRecruitmentCommentLike'
>;

export type TasksRepo = Pick<
	DB,
	| 'listTaskCardsByUser'
	| 'countPendingTaskCardsByUser'
	| 'createOrReplaceTaskCard'
	| 'decideTaskCard'
	| 'listTaskCardsBySource'
	| 'pruneTaskCardsBySourceTargets'
	| 'deleteTaskCardsBySource'
>;

export type InterviewsRepo = Pick<
	DB,
	| 'listInterviewWindows'
	| 'createInterviewWindowWithSlots'
	| 'deleteInterviewWindow'
	| 'listInterviewSlotsWithBooked'
	| 'findInterviewSlotsByIds'
	| 'bookRecruitmentApplication'
>;
