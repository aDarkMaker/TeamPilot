export type HomeAnnouncement = {
	id: string;
	title: string;
	contentMarkdown: string;
	isPinned: boolean;
	createdBy: string;
	createdByUsername: string;
	createdAt: string;
	updatedAt: string;
};

/** A birthday wish joined with its author's profile fields */
export interface BirthdayWish {
	id: string;
	message: string;
	createdAt: string;
	authorId: string;
	authorUsername: string;
	authorNickname: string | null;
	authorAvatarPath: string | null;
}
