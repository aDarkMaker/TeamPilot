import type { Role } from './auth';

export type RecruitmentDepartment = 'vup' | 'video' | 'art' | 'live' | 'copywriting' | 'clip' | 'tech';

export type RecruitmentInterviewSlot = 'none';

export type RecruitmentInterviewMode = 'offline' | 'online';

export type InterviewWindow = {
	id: string;
	date: string;
	startMin: number;
	endMin: number;
	createdAt: string;
	updatedAt: string;
};

export type InterviewSlot = {
	id: string;
	windowId: string;
	date: string;
	startMin: number;
	endMin: number;
};

export type InterviewSlotListItem = InterviewSlot & { booked: boolean };

export type RecruitmentApplication = {
	id: string;
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
	offlineInterviewSlotId: number | null;
	wantsOnlineInterview: boolean;
	onlineInterviewSlot: RecruitmentInterviewSlot | null;
	onlineInterviewSlotId: number | null;
	introMarkdown: string;
	worksMarkdown: string;
	attachmentPath: string | null;
	createdAt: string;
	updatedAt: string;
};

export type RecruitmentApplicationWithTags = RecruitmentApplication & { tags: string[] };

export type RecruitmentApplicationRatingSummary = {
	ratingAverage: number | null;
	ratingCount: number;
};

export type RecruitmentApplicationListItem = RecruitmentApplicationWithTags &
	RecruitmentApplicationRatingSummary & {
		myRating: number | null;
	};

export type RecruitmentApplicationRatingState = RecruitmentApplicationRatingSummary & {
	myRating: number | null;
};

/** Rating totals plus the viewer's own (required) rating, as returned after casting a vote */
export type RecruitmentApplicationRatingAggregate = RecruitmentApplicationRatingSummary & {
	myRating: number;
};

export type RecruitmentComment = {
	id: string;
	applicationId: string;
	authorId: string;
	authorUsername: string;
	authorRole: Role;
	bodyMarkdown: string;
	createdAt: string;
	updatedAt: string;
	likeCount: number;
	likedByMe: boolean;
};

/**
 * Write payload shared by create / upsert / update of a recruitment application.
 * Slot columns are stored as the chosen mode's slot reference.
 */
export type RecruitmentApplicationWriteInput = {
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
};

/** The booking flow resolves slot ids separately, so it omits the slot references */
export type RecruitmentBookingWriteInput = Omit<RecruitmentApplicationWriteInput, 'offlineInterviewSlot' | 'onlineInterviewSlot'>;

/** Comment ownership lookup used for permission checks */
export type RecruitmentCommentMeta = {
	id: string;
	applicationId: string;
	authorId: string;
	authorRole: Role;
};

/** Rating totals for one application, without the viewer's own rating */
export type RecruitmentRatingTotals = {
	ratingAverage: number;
	ratingCount: number;
};
