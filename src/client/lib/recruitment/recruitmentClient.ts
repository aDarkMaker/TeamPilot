import type { NewcomerApplicationView } from '../../types/recruitmentUi';

import {
	mapRecruitmentApplicationDtoToView,
	type RecruitmentApplicationDto,
} from './applicationView';

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

async function parseJson<T>(res: Response): Promise<{ ok: boolean; data?: T; message?: string; code?: string }> {
	return (await res.json().catch(() => ({}))) as { ok: boolean; data?: T; message?: string; code?: string };
}

export async function fetchMe(): Promise<MeBrief | null> {
	const res = await fetch('/api/users/me', { credentials: 'include' });
	const json = await parseJson<MeBrief>(res);
	if (!res.ok || !json.ok || !json.data) return null;
	return json.data;
}

export async function fetchApplications(): Promise<NewcomerApplicationView[]> {
	const res = await fetch('/api/recruitment/applications', { credentials: 'include' });
	const json = await parseJson<RecruitmentApplicationDto[]>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || '申请列表加载失败了');
	return (json.data ?? []).map(mapRecruitmentApplicationDtoToView);
}

export async function fetchComments(applicationId: string): Promise<RecruitmentCommentDto[]> {
	const res = await fetch(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/comments`, {
		credentials: 'include',
	});
	const json = await parseJson<RecruitmentCommentDto[]>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || '评论加载失败了');
	return json.data ?? [];
}

export async function postComment(applicationId: string, bodyMarkdown: string): Promise<RecruitmentCommentDto> {
	const res = await fetch(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/comments`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ bodyMarkdown }),
	});
	const json = await parseJson<RecruitmentCommentDto>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || '发表评论失败了');
	return json.data as RecruitmentCommentDto;
}

export async function patchComment(commentId: string, bodyMarkdown: string): Promise<RecruitmentCommentDto> {
	const res = await fetch(`/api/recruitment/comments/${encodeURIComponent(commentId)}`, {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ bodyMarkdown }),
	});
	const json = await parseJson<RecruitmentCommentDto>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || '保存评论失败了');
	return json.data as RecruitmentCommentDto;
}

export async function deleteComment(commentId: string): Promise<void> {
	const res = await fetch(`/api/recruitment/comments/${encodeURIComponent(commentId)}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	const json = await parseJson<unknown>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || '删除评论失败了');
}

export async function toggleCommentLike(commentId: string): Promise<{ liked: boolean; likeCount: number }> {
	const res = await fetch(`/api/recruitment/comments/${encodeURIComponent(commentId)}/like`, {
		method: 'POST',
		credentials: 'include',
	});
	const json = await parseJson<{ liked: boolean; likeCount: number }>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || '点赞操作失败了');
	return json.data as { liked: boolean; likeCount: number };
}

export async function postTag(applicationId: string, tag: string): Promise<string[]> {
	const res = await fetch(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/tags`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ tag }),
	});
	const json = await parseJson<string[]>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || '添加标签失败了');
	return json.data ?? [];
}

export async function deleteTag(applicationId: string, tag: string): Promise<void> {
	const q = new URLSearchParams({ tag });
	const res = await fetch(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/tags?${q}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	const json = await parseJson<unknown>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || '删除标签失败了');
}

export async function deleteApplication(applicationId: string): Promise<void> {
	const res = await fetch(`/api/recruitment/applications/${encodeURIComponent(applicationId)}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	const json = await parseJson<unknown>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || '删除申请失败了');
}

export type RecruitmentApplicationRatingDto = {
	ratingAverage: number | null;
	ratingCount: number;
	myRating: number;
};

export async function putApplicationRating(
	applicationId: string,
	rating: number,
): Promise<RecruitmentApplicationRatingDto> {
	const res = await fetch(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/rating`, {
		method: 'PUT',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ rating }),
	});
	const json = await parseJson<RecruitmentApplicationRatingDto>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || '评分保存失败了');
	return json.data as RecruitmentApplicationRatingDto;
}

export function isStaffRole(role: string | undefined): boolean {
	return role === 'admin' || role === 'super_admin';
}

const ROLE_RANK: Record<MeBrief['role'], number> = {
	user: 1,
	admin: 2,
	super_admin: 3,
};

export function canDeleteOthersRecruitmentComment(actorRole: MeBrief['role'], authorRole: MeBrief['role']): boolean {
	return ROLE_RANK[actorRole] > ROLE_RANK[authorRole];
}

export function canShowDeleteRecruitmentComment(me: MeBrief | null, c: RecruitmentCommentDto): boolean {
	if (!me) return false;
	if (me.id === c.authorId) return true;
	return canDeleteOthersRecruitmentComment(me.role, c.authorRole);
}
