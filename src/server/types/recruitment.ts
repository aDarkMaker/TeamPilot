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
