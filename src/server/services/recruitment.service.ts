import { z } from "zod";
import type { DB } from "../db";
import { AppError } from "../types/api";
import { canDeleteOthersComment, canReviewApplication } from '../auth/rbac';
import { departmentOrderFromSlug } from "../recruitment/departmentOrder";
import type { RecruitmentDepartment, RecruitmentInterviewSlot } from "../types/recruitment";
import type { Role } from "../types/auth";
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { broadcastRecruitmentApplicationsUpdated } from '../recruitment/recruitmentEvents';

const DEPARTMENT_VALUES = [
	"vup",
	"video",
	"art",
	"live",
	"copywriting",
	"clip",
	"tech",
] as const satisfies readonly [RecruitmentDepartment, ...RecruitmentDepartment[]];

const departmentSchema = z.enum(DEPARTMENT_VALUES);

const INTERVIEW_SLOT_VALUES = ["none"] as const satisfies readonly [
	RecruitmentInterviewSlot,
	...RecruitmentInterviewSlot[],
];

const interviewSlotSchema = z.enum(INTERVIEW_SLOT_VALUES);

const submitSchema = z
    .object({
        fullName: z.string().trim().min(1).max(4),
        contact: z.string().trim().min(13).max(13),
        qq: z.string().trim().regex(/^\d{5,11}$/),
        department: departmentSchema,
        isStudent: z.boolean(),
        schoolCollege: z.string().trim().max(120).nullable().optional(),
        grade: z.string().trim().max(40).nullable().optional(),
        wantsOfflineInterview: z.boolean(),
        offlineInterviewSlot: interviewSlotSchema.nullable().optional(),
        wantsOnlineInterview: z.boolean(),
        onlineInterviewSlot: interviewSlotSchema.nullable().optional(),
        introMarkdown: z.string().max(20000),
        worksMarkdown: z.string().max(20000),
        attachmentPath: z.string().trim().max(500).nullable().optional(),
    })
    .superRefine((v, ctx) => {
        if (v.isStudent && (!v.schoolCollege?.trim() || !v.grade?.trim())) {
            ctx.addIssue({ code: 'custom', message: '在校生填写完整学校和年级信息' });
        }
        if (v.wantsOfflineInterview && !v.offlineInterviewSlot) {
            ctx.addIssue({ code: 'custom', message: '选择线下面试时间' });
        }
        if (v.wantsOnlineInterview && !v.onlineInterviewSlot) {
            ctx.addIssue({ code: 'custom', message: '选择线上面试时间' });
        }
    });

const commentBodySchema = z.object({
    bodyMarkdown: z.string().trim().min(1).max(12000),
});

const CJK_TAG = /^[\u4e00-\u9fff]{1,2}$/;

const tagValueSchema = z
	.string()
	.trim()
	.regex(CJK_TAG, '标签为 1～2 个汉字');

const tagSchema = z.object({
	tag: tagValueSchema,
});

const ratingBodySchema = z.object({
	rating: z
		.number()
		.refine((n) => n >= 0.5 && n <= 5 && Number.isInteger(Math.round(n * 2)), { message: '无效的评分' }),
});

const listQuerySchema = z.object({
    timeOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

function throwMap(e: string): never {
    const m: Record<string, { status: number, code: string, message: string }> = {
		APPLICATION_NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: '申请单不见啦' },
		COMMENT_NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: '评论不见啦' },
		FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: '这里没有你的权限哦' },
		ALREADY_APPLIED: { status: 409, code: 'CONFLICT', message: '你已经投过简历啦' },
		TAG_NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: '标签不见啦' },
    };
    const x = m[e] ?? { status: 500, code: 'INTERNAL', message: '出了点岔子' };
    throw new AppError(x.status, x.code, x.message);
}

export class RecruitmentService {
    constructor(private db: DB) {}

    async submit(user: { id: string }, body: unknown) {
        const p = submitSchema.parse(body);
		const schoolCollege = p.isStudent ? (p.schoolCollege ?? '').trim() || null : null;
		const grade = p.isStudent ? (p.grade ?? '').trim() || null : null;
		const offlineSlot = p.wantsOfflineInterview ? p.offlineInterviewSlot! : null;
		const onlineSlot = p.wantsOnlineInterview ? p.onlineInterviewSlot! : null;

        const created = await this.db.createRecruitmentApplication({
            submitterUserId: user.id,
			fullName: p.fullName.trim(),
			contact: p.contact.trim(),
			qq: p.qq.trim(),
			department: p.department,
			departmentSortOrder: departmentOrderFromSlug(p.department),
			isStudent: p.isStudent,
			schoolCollege,
			grade,
			wantsOfflineInterview: p.wantsOfflineInterview,
			offlineInterviewSlot: offlineSlot,
			wantsOnlineInterview: p.wantsOnlineInterview,
			onlineInterviewSlot: onlineSlot,
			introMarkdown: p.introMarkdown,
			worksMarkdown: p.worksMarkdown,
			attachmentPath: p.attachmentPath?.trim() || null,
		});
		broadcastRecruitmentApplicationsUpdated();
		return created;
    }

    async listApplications(query: unknown, viewerUserId: string) {
        const q = listQuerySchema.parse(query);
        const apps = await this.db.listRecruitmentApplications({ timeOrder: q.timeOrder });
        const [summaries, myRatings] = await Promise.all([
            this.db.listRecruitmentRatingSummaries(),
            this.db.listRecruitmentRatingsByUser(viewerUserId),
        ]);
        const withTags = await Promise.all(
            apps.map(async (a) => {
                const summary = summaries.get(a.id);
                return {
                    ...a,
                    tags: await this.db.listRecruitmentApplicationTags(a.id),
                    ratingAverage: summary?.ratingAverage ?? null,
                    ratingCount: summary?.ratingCount ?? 0,
                    myRating: myRatings.get(a.id) ?? null,
                };
            }),
        );
        return withTags;
    }

    async setApplicationRating(applicationId: string, user: { id: string }, body: unknown) {
        const app = await this.db.findRecruitmentApplicationById(applicationId);
        if (!app) throwMap('APPLICATION_NOT_FOUND');
        const p = ratingBodySchema.parse(body);
        const result = await this.db.upsertRecruitmentApplicationRating({
            applicationId,
            userId: user.id,
            rating: p.rating,
        });
        broadcastRecruitmentApplicationsUpdated();
        return result;
    }

	async getApplication(id: string) {
		const app = await this.db.findRecruitmentApplicationById(id);
		if (!app) throwMap('APPLICATION_NOT_FOUND');
		const tags = await this.db.listRecruitmentApplicationTags(id);
		return { ...app, tags };
	}

	listComments(applicationId: string, viewer: { id: string }) {
		return this.db.listRecruitmentComments(applicationId, viewer.id);
	}

    async createComment(applicationId: string, user: { id: string }, body: unknown) {
        const app = await this.db.findRecruitmentApplicationById(applicationId);
        if (!app) throwMap('APPLICATION_NOT_FOUND');
        const p = commentBodySchema.parse(body);
        return this.db.createRecruitmentComment({
            applicationId,
            authorId: user.id,
            bodyMarkdown: p.bodyMarkdown,
        });
    }

    async updateComment(commentId: string, user: { id: string }, body: unknown) {
        const p = commentBodySchema.parse(body);
        try {
            return await this.db.updateRecruitmentComment({
                commentId,
                authorId: user.id,
                bodyMarkdown: p.bodyMarkdown,
            });
		} catch (e) {
			if (e instanceof Error && e.message === 'COMMENT_NOT_FOUND_OR_FORBIDDEN') throwMap('FORBIDDEN');
			throw e;
		}
    }

    async deleteComment(commentId: string, actor: { id: string; role: Role }) {
		const meta = await this.db.findRecruitmentCommentMeta(commentId);
		if (!meta) throwMap('COMMENT_NOT_FOUND');
		if (meta.authorId === actor.id) {
			await this.db.deleteRecruitmentComment(commentId);
			return;
		}
		if (!canDeleteOthersComment(actor.role, meta.authorRole)) throwMap('FORBIDDEN');
		await this.db.deleteRecruitmentComment(commentId);
	}

    async toggleLike(commentId: string, user: { id: string }) {
        const meta = await this.db.findRecruitmentCommentMeta(commentId);
        if (!meta) throwMap('COMMENT_NOT_FOUND');
        return this.db.toggleRecruitmentCommentLike({ commentId, userId: user.id });
    }

	async addTag(applicationId: string, actor: { id: string }, body: unknown) {
		const app = await this.db.findRecruitmentApplicationById(applicationId);
		if (!app) throwMap('APPLICATION_NOT_FOUND');
		const p = tagSchema.parse(body);
		await this.db.addRecruitmentApplicationTag({
			applicationId,
			tag: p.tag,
			createdBy: actor.id,
		});
		return this.db.listRecruitmentApplicationTags(applicationId);
	}

	async removeTag(applicationId: string, actor: { id: string; role: Role }, tagRaw: string) {
		const app = await this.db.findRecruitmentApplicationById(applicationId);
		if (!app) throwMap('APPLICATION_NOT_FOUND');
		const tag = tagValueSchema.parse(tagRaw);
		const createdBy = await this.db.findRecruitmentTagCreatedBy({ applicationId, tag });
		if (createdBy == null) throwMap('TAG_NOT_FOUND');
		const isAdmin = canReviewApplication(actor.role);
		const isOwner = createdBy === actor.id;
		if (!isAdmin && !isOwner) throwMap('FORBIDDEN');
		await this.db.removeRecruitmentApplicationTag({ applicationId, tag });
	}

	async deleteApplication(applicationId: string): Promise<{ id: string }> {
		const app = await this.db.findRecruitmentApplicationById(applicationId);
		if (!app) throwMap('APPLICATION_NOT_FOUND');

		await this.db.deleteRecruitmentApplicationById(applicationId);

		const attachmentPath = app.attachmentPath?.trim() ?? '';
		if (attachmentPath.startsWith('joinus/')) {
			const first = attachmentPath.split('|')[0]?.trim() ?? '';
			const parts = first.split('/').filter(Boolean);
			const slug = parts[1] ?? '';
			if (slug && /^[a-z0-9_]+$/.test(slug)) {
				const dir = join(process.cwd(), 'data', 'joinus', slug);
				await rm(dir, { recursive: true, force: true }).catch(() => undefined);
			}
		}

		broadcastRecruitmentApplicationsUpdated();
		return { id: applicationId };
	}
}
