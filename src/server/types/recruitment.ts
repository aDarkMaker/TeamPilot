import type { Role } from "./auth";

export type RecruitmentDepartment =
	| 'vup'
	| 'video'
	| 'art'
	| 'live'
	| 'copywriting'
	| 'clip'
	| 'tech';

export type RecruitmentInterviewSlot =
    | 'none';

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
    wantsOnlineInterview: boolean;
    onlineInterviewSlot: RecruitmentInterviewSlot | null;
    introMarkdown: string;
    worksMarkdown: string;
    attachmentPath: string | null;
    createdAt: string;
    updatedAt: string;
};

export type RecruitmentApplicationWithTags = RecruitmentApplication & { tags: string[] };

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