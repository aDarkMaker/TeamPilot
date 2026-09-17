import type { NewcomerApplicationView } from './types';
import { httpJson, httpJsonVoid } from '@/lib/httpJson';
import { isStaffRole, roleRank } from '@/lib/roles';

import { mapRecruitmentApplicationDtoToView, type RecruitmentApplicationDto } from './applicationView';

export type MeBrief = { id: string; username: string; role: 'user' | 'admin' | 'super_admin' };

export type RecruitmentCommentDto = {
	id: string;
	applicationId: string;
	authorId: string;
	authorUsername: string;
	authorRole: MeBrief['role'];
	bodyMarkdown: string;
	createdAt: string;
	updatedAt: string;
	likeCount: number;
	likedByMe: boolean;
};

export async function fetchMe(): Promise<MeBrief | null> {
	const res = await fetch('/api/users/me', { credentials: 'include' });
	const json = (await res.json().catch(() => ({}))) as { ok?: boolean; data?: MeBrief };
	if (!res.ok || !json.ok || !json.data) return null;
	return json.data;
}

export async function fetchApplications(): Promise<NewcomerApplicationView[]> {
	const data = await httpJson<RecruitmentApplicationDto[]>('/api/recruitment/applications', {
		fallbackMessage: '申请列表加载失败了',
	});
	return (data ?? []).map(mapRecruitmentApplicationDtoToView);
}

export async function fetchComments(applicationId: string): Promise<RecruitmentCommentDto[]> {
	const data = await httpJson<RecruitmentCommentDto[]>(
		`/api/recruitment/applications/${encodeURIComponent(applicationId)}/comments`,
		{ fallbackMessage: '评论加载失败了' }
	);
	return data ?? [];
}

export function postComment(applicationId: string, bodyMarkdown: string): Promise<RecruitmentCommentDto> {
	return httpJson<RecruitmentCommentDto>(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/comments`, {
		method: 'POST',
		body: { bodyMarkdown },
		fallbackMessage: '发表评论失败了',
	});
}

export function patchComment(commentId: string, bodyMarkdown: string): Promise<RecruitmentCommentDto> {
	return httpJson<RecruitmentCommentDto>(`/api/recruitment/comments/${encodeURIComponent(commentId)}`, {
		method: 'PATCH',
		body: { bodyMarkdown },
		fallbackMessage: '保存评论失败了',
	});
}

export function deleteComment(commentId: string): Promise<void> {
	return httpJsonVoid(`/api/recruitment/comments/${encodeURIComponent(commentId)}`, {
		method: 'DELETE',
		fallbackMessage: '删除评论失败了',
	});
}

export function toggleCommentLike(commentId: string): Promise<{ liked: boolean; likeCount: number }> {
	return httpJson<{ liked: boolean; likeCount: number }>(
		`/api/recruitment/comments/${encodeURIComponent(commentId)}/like`,
		{ method: 'POST', fallbackMessage: '点赞操作失败了' }
	);
}

export async function postTag(applicationId: string, tag: string): Promise<string[]> {
	const data = await httpJson<string[]>(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/tags`, {
		method: 'POST',
		body: { tag },
		fallbackMessage: '添加标签失败了',
	});
	return data ?? [];
}

export function deleteTag(applicationId: string, tag: string): Promise<void> {
	return httpJsonVoid(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/tags`, {
		method: 'DELETE',
		query: { tag },
		fallbackMessage: '删除标签失败了',
	});
}

export function deleteApplication(applicationId: string): Promise<void> {
	return httpJsonVoid(`/api/recruitment/applications/${encodeURIComponent(applicationId)}`, {
		method: 'DELETE',
		fallbackMessage: '删除申请失败了',
	});
}

export type RecruitmentApplicationRatingDto = {
	ratingAverage: number | null;
	ratingCount: number;
	myRating: number;
};

export function putApplicationRating(applicationId: string, rating: number): Promise<RecruitmentApplicationRatingDto> {
	return httpJson<RecruitmentApplicationRatingDto>(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/rating`, {
		method: 'PUT',
		body: { rating },
		fallbackMessage: '评分保存失败了',
	});
}

export function canDeleteOthersRecruitmentComment(actorRole: MeBrief['role'], authorRole: MeBrief['role']): boolean {
	return roleRank(actorRole) > roleRank(authorRole);
}

export function canShowDeleteRecruitmentComment(me: MeBrief | null, c: RecruitmentCommentDto): boolean {
	if (!me) return false;
	if (me.id === c.authorId) return true;
	return canDeleteOthersRecruitmentComment(me.role, c.authorRole);
}

export { isStaffRole };
