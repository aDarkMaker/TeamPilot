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
	if (!res.ok || !json.ok) throw new Error(json.message || 'LOAD_APPLICATIONS_FAILED');
	return (json.data ?? []).map(mapRecruitmentApplicationDtoToView);
}

export async function fetchComments(applicationId: string): Promise<RecruitmentCommentDto[]> {
	const res = await fetch(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/comments`, {
		credentials: 'include',
	});
	const json = await parseJson<RecruitmentCommentDto[]>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || 'LOAD_COMMENTS_FAILED');
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
	if (!res.ok || !json.ok) throw new Error(json.message || 'POST_COMMENT_FAILED');
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
	if (!res.ok || !json.ok) throw new Error(json.message || 'PATCH_COMMENT_FAILED');
	return json.data as RecruitmentCommentDto;
}

export async function deleteComment(commentId: string): Promise<void> {
	const res = await fetch(`/api/recruitment/comments/${encodeURIComponent(commentId)}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	const json = await parseJson<unknown>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || 'DELETE_COMMENT_FAILED');
}

export async function toggleCommentLike(commentId: string): Promise<{ liked: boolean; likeCount: number }> {
	const res = await fetch(`/api/recruitment/comments/${encodeURIComponent(commentId)}/like`, {
		method: 'POST',
		credentials: 'include',
	});
	const json = await parseJson<{ liked: boolean; likeCount: number }>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || 'LIKE_FAILED');
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
	if (!res.ok || !json.ok) throw new Error(json.message || 'POST_TAG_FAILED');
	return json.data ?? [];
}

export async function deleteTag(applicationId: string, tag: string): Promise<void> {
	const q = new URLSearchParams({ tag });
	const res = await fetch(`/api/recruitment/applications/${encodeURIComponent(applicationId)}/tags?${q}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	const json = await parseJson<unknown>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || 'DELETE_TAG_FAILED');
}

export async function deleteApplication(applicationId: string): Promise<void> {
	const res = await fetch(`/api/recruitment/applications/${encodeURIComponent(applicationId)}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	const json = await parseJson<unknown>(res);
	if (!res.ok || !json.ok) throw new Error(json.message || 'DELETE_APPLICATION_FAILED');
}

export function isStaffRole(role: string | undefined): boolean {
	return role === 'admin' || role === 'super_admin';
}
