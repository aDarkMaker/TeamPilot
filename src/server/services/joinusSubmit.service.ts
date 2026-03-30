import type { DB } from "../db";
import { AppError } from "../types/api";
import type { RecruitmentDepartment, RecruitmentInterviewSlot } from "../types/recruitment";
import { departmentOrderFromSlug } from "../recruitment/departmentOrder";
import { getJoinUsPublicUserId } from "../auth/bootstrapJoinUsPublicUser";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { pinyin } from "pinyin-pro";
import { broadcastRecruitmentApplicationsUpdated } from "../recruitment/recruitmentEvents";

type UploadedFile = { buffer: Buffer; mimetype: string; originalName: string };

const DEPT_CN_TO_SLUG: Record<string, RecruitmentDepartment> = {
	中之人: 'vup',
	视频组: 'video',
	美术组: 'art',
	直播组: 'live',
	文案组: 'copywriting',
	切片组: 'clip',
	技术组: 'tech',
};

const INTERVIEW_SLOT_NONE: RecruitmentInterviewSlot = 'none';

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

function nameToPinyinSlug(rawName: string): string {
    const normalized = rawName.trim();
    if (!normalized) return 'unknown';

    const slugRaw = pinyin(normalized, {
        toneType: 'none',
        type: 'string',
        separator: '',
        nonZh: 'removed',
    });
    const fallback = normalized.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const raw = (slugRaw ? String(slugRaw) : fallback).toLowerCase();
	const safe = raw.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return safe || 'unknown';
}

function extFromMime(mime: string): string | null {
    if (!mime) return null;
    const m = mime.toLowerCase();
	if (m === 'application/pdf') return 'pdf';
	if (m === 'image/jpeg') return 'jpg';
	if (m === 'image/png') return 'png';
	if (m === 'image/webp') return 'webp';
	if (m.startsWith('image/')) return m.split('/')[1] || null;
	return null;
}

function sanitizeFileName(raw: string): string {
	const name = (raw ?? '').trim();
	if (!name) return 'attachment';
	const cleaned = name
		.replace(/[\\\/]+/g, '_')
		.replace(/[\u0000-\u001f\u007f]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	const safe = cleaned.replace(/[<>:"|?*\u0000-\u001f]/g, '_');
	return safe.slice(0, 120) || 'attachment';
}

function ensureExt(fileName: string, ext: string): string {
	const lower = fileName.toLowerCase();
	const e = ext.startsWith('.') ? ext.slice(1) : ext;
	if (!e) return fileName;
	if (lower.endsWith(`.${e}`)) return fileName;
	return `${fileName}.${e}`;
}

export class JoinUsSubmitService {
	constructor(private db: DB) {}
	async submitAnonymous(fields: Record<string, unknown>, uploads: UploadedFile[]): Promise<void> {
		const fullName = normalizeText(fields.name);
		const contact = normalizeText(fields.contact);
		const qq = normalizeText(fields.qq);

		if (!fullName) throw new AppError(400, 'INVALID_NAME', '姓名不能为空');
		if (!contact) throw new AppError(400, 'INVALID_CONTACT', '联系方式不能为空');
		if (!qq) throw new AppError(400, 'INVALID_QQ', 'QQ不能为空');

		const departmentCn = normalizeText(fields.department);
		const department = DEPT_CN_TO_SLUG[departmentCn];
		if (!department) throw new AppError(400, 'INVALID_DEPARTMENT', '意向部门不合法');

		const isStudent = isYes(fields.student);
		const schoolCollege = isStudent ? normalizeText(fields.college) || null : null;
		const grade = isStudent ? normalizeText(fields.grade) || null : null;

		const wantsOfflineInterview = isYes(fields.offline_interview);
		const offlineInterviewSlot: RecruitmentInterviewSlot | null = wantsOfflineInterview ? INTERVIEW_SLOT_NONE : null;

		const wantsOnlineInterview = isYes(fields.online_interview);
		const onlineInterviewSlot: RecruitmentInterviewSlot | null = wantsOnlineInterview ? INTERVIEW_SLOT_NONE : null;

		const introRaw = normalizeText(fields.intro);
		const introBase = introRaw || '（无）';
		const offlineTime = normalizeText(fields.interview_time_offline);
		const onlineTime = normalizeText(fields.interview_time_online);

		const extra: string[] = [];
		if (wantsOfflineInterview) extra.push(`线下面试时间：${offlineTime || '待定'}`);
		if (wantsOnlineInterview) extra.push(`线上面试时间：${onlineTime || '待定'}`);
		if (!wantsOfflineInterview && !wantsOnlineInterview) extra.push('面试：待定');
		const introMarkdown = extra.length ? `${introBase}\n\n---\n${extra.join('；')}` : introBase;
		const worksMarkdown = uploads.length
			? `已上传附件：\n${uploads.map((u) => `- ${u.originalName}`).join('\n')}`
			: '（无）';

		let attachmentPath: string | null = null;
		if (uploads.length > 0) {
			const slug = nameToPinyinSlug(fullName);
			const joinusDir = join(process.cwd(), 'data', 'joinus', slug);
			mkdirSync(joinusDir, { recursive: true });
			const relPaths: string[] = [];
			for (let i = 0; i < uploads.length; i++) {
				const u = uploads[i];
                if (u === undefined) continue;
                
				const ext = extFromMime(u.mimetype) || 'bin';
				const base = `${randomUUID().slice(0, 8)}_${i}__${sanitizeFileName(u.originalName)}`;
				const destName = ensureExt(base, ext);
				const abs = join(joinusDir, destName);
				writeFileSync(abs, u.buffer);

				relPaths.push(`joinus/${slug}/${destName}`);
			}
			attachmentPath = relPaths.join('|');
		} else {
			attachmentPath = null;
		}
		const submitterUserId = await getJoinUsPublicUserId(this.db);
		const departmentSortOrder = departmentOrderFromSlug(department);
		await this.db.upsertRecruitmentApplicationByContact({
			submitterUserId,
			fullName,
			contact,
			qq,
			department,
			departmentSortOrder,
			isStudent,
			schoolCollege,
			grade,
			wantsOfflineInterview,
			offlineInterviewSlot,
			wantsOnlineInterview,
			onlineInterviewSlot,
			introMarkdown,
			worksMarkdown,
			attachmentPath,
		});
		broadcastRecruitmentApplicationsUpdated();
	}
}