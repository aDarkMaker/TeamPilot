export const INTERVIEW_OFFLINE_FIELD = 'interview_time_offline';
export const INTERVIEW_ONLINE_FIELD = 'interview_time_online';
export const INTRO_OFFLINE_PREFIX = '线下面试时间：';
export const INTRO_ONLINE_PREFIX = '线上面试时间：';

export type InterviewIntroInput = {
	wantsOfflineInterview: boolean;
	offlineTime: string;
	wantsOnlineInterview: boolean;
	onlineTime: string;
};

export function buildInterviewIntroExtra(input: InterviewIntroInput): string[] {
	const extra: string[] = [];
	if (input.wantsOfflineInterview) {
		extra.push(`${INTRO_OFFLINE_PREFIX}${input.offlineTime || '待定'}`);
	}
	if (input.wantsOnlineInterview) {
		extra.push(`${INTRO_ONLINE_PREFIX}${input.onlineTime || '待定'}`);
	}
	if (!input.wantsOfflineInterview && !input.wantsOnlineInterview) {
		extra.push('面试：待定');
	}
	return extra;
}

export function appendInterviewIntroToMarkdown(introBase: string, extra: string[]): string {
	if (!extra.length) return introBase;
	return `${introBase}\n\n---\n${extra.join('；')}`;
}

export function parseInterviewFromIntro(introMarkdown: string): {
	introClean: string;
	offlineTime: string | null;
	onlineTime: string | null;
} {
	const raw = (introMarkdown ?? '').trim();
	if (!raw) return { introClean: '（无）', offlineTime: null, onlineTime: null };

	let offlineTime: string | null = null;
	let onlineTime: string | null = null;

	const off = raw.match(new RegExp(`${escapeRegExp(INTRO_OFFLINE_PREFIX)}([^\\n；]+)\\s*`));
	if (off?.[1]) offlineTime = off[1].trim() || null;
	const on = raw.match(new RegExp(`${escapeRegExp(INTRO_ONLINE_PREFIX)}([^\\n；]+)\\s*`));
	if (on?.[1]) onlineTime = on[1].trim() || null;

	let introClean = raw;
	if (offlineTime || onlineTime) {
		introClean = introClean.replace(/\n*\s*---\s*\n[\s\S]*$/, '').trim();
	}
	if (!introClean) introClean = '（无）';
	return { introClean, offlineTime, onlineTime };
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
