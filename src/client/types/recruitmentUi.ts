/** 与后端 RecruitmentApplication 对齐；附件为前端多文件视图扩展。 */
export type RecruitmentDepartmentSlug =
	| 'vup'
	| 'video'
	| 'art'
	| 'live'
	| 'copywriting'
	| 'clip'
	| 'tech';

export type RecruitmentInterviewSlotSlug = 'none';

export type RecruitmentAttachmentKind = 'pdf' | 'image' | 'other';

export type RecruitmentAttachment = {
	id: string;
	fileName: string;
	url: string;
	mimeType: string;
	kind: RecruitmentAttachmentKind;
};

export type NewcomerApplicationView = {
	id: string;
	submitterUserId: string;
	fullName: string;
	contact: string;
	qq: string;
	department: RecruitmentDepartmentSlug;
	isStudent: boolean;
	schoolCollege: string | null;
	grade: string | null;
	wantsOfflineInterview: boolean;
	offlineInterviewSlot: RecruitmentInterviewSlotSlug | null;
	wantsOnlineInterview: boolean;
	onlineInterviewSlot: RecruitmentInterviewSlotSlug | null;
	introMarkdown: string;
	worksMarkdown: string;
	tags: string[];
	attachments: RecruitmentAttachment[];
	createdAt: string;
};
