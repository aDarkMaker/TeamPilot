import type {
	NewcomerApplicationView,
	RecruitmentAttachment,
	RecruitmentAttachmentKind,
	RecruitmentDepartmentSlug,
	RecruitmentInterviewSlotSlug,
} from '../../types/recruitmentUi';

export type RecruitmentApplicationDto = {
	id: string;
	submitterUserId: string;
	fullName: string;
	contact: string;
	qq: string;
	department: string;
	departmentSortOrder: number;
	isStudent: boolean;
	schoolCollege: string | null;
	grade: string | null;
	wantsOfflineInterview: boolean;
	offlineInterviewSlot: string | null;
	wantsOnlineInterview: boolean;
	onlineInterviewSlot: string | null;
	introMarkdown: string;
	worksMarkdown: string;
	attachmentPath: string | null;
	createdAt: string;
	updatedAt: string;
	tags: string[];
};

function inferAttachmentMeta(fileName: string): { kind: RecruitmentAttachmentKind; mimeType: string } {
	const lower = fileName.toLowerCase();
	if (lower.endsWith('.pdf')) return { kind: 'pdf', mimeType: 'application/pdf' };
	if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lower)) return { kind: 'image', mimeType: 'image/jpeg' };
	return { kind: 'other', mimeType: 'application/octet-stream' };
}

function publicUrlFromStoredPath(path: string): string {
	const p = path.trim();
	if (!p) return '';
	if (p.startsWith('http://') || p.startsWith('https://')) return p;
	if (p.startsWith('/')) return p;

	if (p.startsWith('joinus/')) {
		return `/joinus-files/${p.replace(/^joinus\//, '')}`;
	}

	return `/uploads/${p.replace(/^\/+/, '')}`;
}

function attachmentsFromPath(attachmentPath: string | null): RecruitmentAttachment[] {
	if (!attachmentPath?.trim()) return [];

	const parts = attachmentPath
		.split('|')
		.map((x) => x.trim())
		.filter(Boolean);
	
	return parts
		.map((raw, i) => {
			const storedName = raw.split(/[/\\]/).pop() || '附件';
			const fileName = displayNameFromStoredName(storedName);
			const url = publicUrlFromStoredPath(raw);
			const { kind, mimeType } = inferAttachmentMeta(fileName);
			return { id: String(i), fileName, url, mimeType, kind } as RecruitmentAttachment;
		})
		.filter((x) => Boolean(x));
}

function displayNameFromStoredName(storedName: string): string {
	const name = (storedName ?? '').trim();
	if (!name) return '附件';

	// 新格式：<uuid>_<i>__<original>
	const idx = name.indexOf('__');
	const raw = idx >= 0 ? name.slice(idx + 2) : name;
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}

export function mapRecruitmentApplicationDtoToView(dto: RecruitmentApplicationDto): NewcomerApplicationView {
	return {
		id: dto.id,
		submitterUserId: dto.submitterUserId,
		fullName: dto.fullName,
		contact: dto.contact,
		qq: dto.qq,
		department: dto.department as RecruitmentDepartmentSlug,
		isStudent: dto.isStudent,
		schoolCollege: dto.schoolCollege,
		grade: dto.grade,
		wantsOfflineInterview: dto.wantsOfflineInterview,
		offlineInterviewSlot: (dto.offlineInterviewSlot ?? null) as RecruitmentInterviewSlotSlug | null,
		wantsOnlineInterview: dto.wantsOnlineInterview,
		onlineInterviewSlot: (dto.onlineInterviewSlot ?? null) as RecruitmentInterviewSlotSlug | null,
		introMarkdown: dto.introMarkdown,
		worksMarkdown: dto.worksMarkdown,
		tags: [...dto.tags],
		attachments: attachmentsFromPath(dto.attachmentPath),
		createdAt: dto.createdAt,
	};
}
