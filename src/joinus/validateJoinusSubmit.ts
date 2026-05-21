import { AppError } from '../server/types/api';
import { DEPT_CN_TO_SLUG } from './departments';
import type { JoinUsFormConfig } from './formConfigSchema';
import {
	INTERVIEW_OFFLINE_FIELD,
	INTERVIEW_ONLINE_FIELD,
} from './interviewIntro';

export const FORM_OUTDATED_CODE = 'FORM_OUTDATED';

function toStr(v: unknown): string {
	if (v == null) return '';
	if (Array.isArray(v)) return String(v[0] ?? '');
	return String(v);
}

function normalizeText(raw: unknown): string {
	return toStr(raw).trim();
}

function isYes(v: unknown): boolean {
	return normalizeText(v) === '是';
}

function questionOptions(config: JoinUsFormConfig, id: string): string[] {
	const q = config.questions.find((item) => item.id === id);
	return q?.options ?? [];
}

function formOutdated(message: string): never {
	throw new AppError(400, FORM_OUTDATED_CODE, message);
}

const JOINUS_NAME_MIN_LEN = 2;
const JOINUS_NAME_MAX_LEN = 10;
const JOINUS_NAME_RE = /^[\u4e00-\u9fff]+(?:·[\u4e00-\u9fff]+)*$/;

function assertValidJoinUsName(fullName: string): void {
	if (!fullName) {
		throw new AppError(400, 'INVALID_NAME', '姓名不能为空');
	}
	if (/\d/.test(fullName)) {
		throw new AppError(400, 'INVALID_NAME', '姓名不能包含数字');
	}
	if (fullName.length < JOINUS_NAME_MIN_LEN) {
		throw new AppError(400, 'INVALID_NAME', '姓名至少2个汉字');
	}
	if (fullName.length > JOINUS_NAME_MAX_LEN) {
		throw new AppError(400, 'INVALID_NAME', '姓名过长，请缩短后重试');
	}
	if (!JOINUS_NAME_RE.test(fullName)) {
		throw new AppError(400, 'INVALID_NAME', '姓名须为汉字，少数民族姓名可用「·」连接');
	}
}

export function validateJoinusSubmitAgainstConfig(
	config: JoinUsFormConfig,
	fields: Record<string, unknown>
): void {
	const fullName = normalizeText(fields.name);
	const contact = normalizeText(fields.contact);
	const qq = normalizeText(fields.qq);

	assertValidJoinUsName(fullName);

	if (!contact) {
		throw new AppError(400, 'INVALID_CONTACT', '联系方式不能为空');
	}
	if (!/^\d{11}$/.test(contact)) {
		throw new AppError(400, 'INVALID_CONTACT', '请输入11位手机号码');
	}

	if (!qq) {
		throw new AppError(400, 'INVALID_QQ', 'QQ不能为空');
	}
	if (!/^\d{5,11}$/.test(qq)) {
		throw new AppError(400, 'INVALID_QQ', 'QQ号须为5-11位纯数字');
	}

	const departmentCn = normalizeText(fields.department);
	if (!departmentCn || !DEPT_CN_TO_SLUG[departmentCn]) {
		throw new AppError(400, 'INVALID_DEPARTMENT', '意向部门不合法');
	}
	const deptOpts = questionOptions(config, 'department');
	if (!deptOpts.includes(departmentCn)) {
		formOutdated('意向部门选项已更新，请刷新页面后重新选择');
	}

	const wantsOfflineInterview = isYes(fields.offline_interview);
	const wantsOnlineInterview = isYes(fields.online_interview);
	const offlineTime = normalizeText(fields.interview_time_offline);
	const onlineTime = normalizeText(fields.interview_time_online);

	const offlineOpts = questionOptions(config, INTERVIEW_OFFLINE_FIELD);
	const onlineOpts = questionOptions(config, INTERVIEW_ONLINE_FIELD);

	if (!wantsOfflineInterview && offlineTime) {
		formOutdated('线下面试选项已更新，请刷新页面后重新填写');
	}
	if (!wantsOnlineInterview && onlineTime) {
		formOutdated('线上面试选项已更新，请刷新页面后重新填写');
	}

	if (wantsOfflineInterview) {
		if (!offlineTime) {
			throw new AppError(400, 'INVALID_OFFLINE_TIME', '请选择线下面试时间');
		}
		if (!offlineOpts.includes(offlineTime)) {
			formOutdated('线下面试时间选项已更新，请刷新页面后重新选择');
		}
	}

	if (wantsOnlineInterview) {
		if (!onlineTime) {
			throw new AppError(400, 'INVALID_ONLINE_TIME', '请选择线上面试时间');
		}
		if (!onlineOpts.includes(onlineTime)) {
			formOutdated('线上面试时间选项已更新，请刷新页面后重新选择');
		}
	}
}
