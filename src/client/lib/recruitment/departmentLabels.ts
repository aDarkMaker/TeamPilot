import type { RecruitmentDepartmentSlug } from '../../types/recruitmentUi';

export const DEPARTMENT_ORDER: RecruitmentDepartmentSlug[] = [
	'tech',
	'video',
	'live',
	'clip',
	'art',
	'copywriting',
	'vup',
];

export const DEPARTMENT_LABELS: Record<RecruitmentDepartmentSlug, string> = {
	vup: '中之人',
	video: '视频组',
	art: '美术组',
	live: '直播组',
	copywriting: '文案组',
	clip: '切片组',
	tech: '技术组',
};

export function interviewSlotLabel(slot: string | null): string {
	if (!slot || slot === 'none') return '均不便 / 待定';
	return slot;
}
