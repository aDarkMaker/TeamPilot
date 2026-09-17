import { failWith, type ErrorMapEntry } from './errorMap';

/**
 * Business codes raised by the db layer for the recruitment domain.
 * Shared so the application / comment / tag services stay consistent.
 */
const RECRUITMENT_ERRORS: Record<string, ErrorMapEntry> = {
	APPLICATION_NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: '申请单不见啦' },
	COMMENT_NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: '评论不见啦' },
	FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: '这里没有你的权限哦' },
	ALREADY_APPLIED: { status: 409, code: 'CONFLICT', message: '你已经投过简历啦' },
	TAG_NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: '标签不见啦' },
};

export function failRecruitment(code: string): never {
	return failWith(RECRUITMENT_ERRORS, code);
}
