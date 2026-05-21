import type { DB } from "../db";
import { AppError } from "../types/api";
import type { RecruitmentInterviewSlot } from "../types/recruitment";
import { DEPT_CN_TO_SLUG } from "../../joinus/departments";
import { readJoinUsFormConfig } from "../../joinus/formConfigIO";
import { validateJoinusSubmitAgainstConfig } from "../../joinus/validateJoinusSubmit";
import { departmentOrderFromSlug } from "../recruitment/departmentOrder";
import { getJoinUsPublicUserId } from "../auth/bootstrapJoinUsPublicUser";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { pinyin } from "pinyin-pro";
import { broadcastRecruitmentApplicationsUpdated } from "../recruitment/recruitmentEvents";
import {
	appendInterviewIntroToMarkdown,
	buildInterviewIntroExtra,
} from "../../joinus/interviewIntro";

type UploadedFile = { buffer: Buffer; mimetype: string; originalName: string };

const INTERVIEW_SLOT_NONE: RecruitmentInterviewSlot = 'none';

export const JOINUS_DUPLICATE_SUBMIT_CODE = 'DUPLICATE_SUBMIT';

function isOverwrite(fields: Record<string, unknown>): boolean {
	const v = fields.overwrite;
	if (v === true || v === 1) return true;
	return normalizeText(v) === '1';
}

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
		const formConfig = await readJoinUsFormConfig();
		validateJoinusSubmitAgainstConfig(formConfig, fields);

		const fullName = normalizeText(fields.name);
		const contact = normalizeText(fields.contact);
		const qq = normalizeText(fields.qq);

		const departmentCn = normalizeText(fields.department);
		const department = DEPT_CN_TO_SLUG[departmentCn]!;

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

		const extra = buildInterviewIntroExtra({
			wantsOfflineInterview,
			offlineTime,
			wantsOnlineInterview,
			onlineTime,
		});
		const introMarkdown = appendInterviewIntroToMarkdown(introBase, extra);
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
		const payload = {
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
		};

		const existing = await this.db.findRecruitmentApplicationByIdentityConflict(fullName, contact, qq);
		if (existing && !isOverwrite(fields)) {
			throw new AppError(409, JOINUS_DUPLICATE_SUBMIT_CODE, '你已经提交过了');
		}

		if (existing && isOverwrite(fields)) {
			const contactOwner = await this.db.findRecruitmentApplicationByContact(contact);
			if (contactOwner && contactOwner.id !== existing.id) {
				throw new AppError(409, JOINUS_DUPLICATE_SUBMIT_CODE, '该手机号已被其他报名使用');
			}
			await this.db.updateRecruitmentApplicationById(existing.id, payload);
		} else {
			await this.db.createRecruitmentApplication(payload);
		}
		broadcastRecruitmentApplicationsUpdated();
	}
}