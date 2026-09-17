import type { DB } from '../../db';
import type { RecruitmentApplication } from '../../types/recruitment';
import { dedupeLatestBy } from '../../lib/dedupeLatest';
import { normalizeKey } from '../../lib/pinyinSearch';
import { textContains } from './textContains';
import { highlightUrl, type SearchContext, type SearchResultItem } from './types';

const LIMIT = 5;

export async function searchNewcomers(db: DB, ctx: SearchContext): Promise<SearchResultItem[]> {
	const all = await db.listRecruitmentApplications({ timeOrder: 'desc' });

	const matched: RecruitmentApplication[] = all.filter(
		(a) =>
			textContains(a.fullName, ctx.rawQ) ||
			textContains(a.contact, ctx.rawQ) ||
			textContains(a.schoolCollege, ctx.rawQ) ||
			textContains(a.introMarkdown, ctx.rawQ)
	);

	// The same person may have resubmitted; keep the newest record per name+contact.
	const deduped = dedupeLatestBy(
		matched,
		(a) => `${normalizeKey(a.fullName)}|${normalizeKey(a.contact)}`,
		(a) => a.updatedAt
	)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, LIMIT);

	return deduped.map((nc) => ({
		id: nc.id,
		type: 'newcomer' as const,
		title: nc.fullName,
		subtitle: `${nc.department} · ${nc.grade ? `${nc.grade}级 · ` : ''}${nc.schoolCollege ?? ''}`,
		url: highlightUrl('/dashboard/newcomers', ctx.rawQ),
		matchField: 'fullName',
		matchText: nc.fullName,
	}));
}
