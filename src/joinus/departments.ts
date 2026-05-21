import type { RecruitmentDepartment } from '../server/types/recruitment';

export const DEPT_CN_TO_SLUG: Record<string, RecruitmentDepartment> = {
	中之人: 'vup',
	视频组: 'video',
	美术组: 'art',
	直播组: 'live',
	文案组: 'copywriting',
	切片组: 'clip',
	技术组: 'tech',
};

export const DEPARTMENT_OPTIONS = Object.keys(DEPT_CN_TO_SLUG);
