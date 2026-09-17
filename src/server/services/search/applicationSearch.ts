import type { DB } from '../../db';
import type { AccountApplication } from '../../types/application';
import { dedupeLatestBy } from '../../lib/dedupeLatest';
import { normalizeKey } from '../../lib/pinyinSearch';
import { textContains } from './textContains';
import { highlightUrl, type SearchContext, type SearchResultItem } from './types';

const LIMIT = 3;

/** Pending account applications (distinct from recruitment submissions) */
export async function searchApplications(db: DB, ctx: SearchContext): Promise<SearchResultItem[]> {
	const pending = await db.findPendingApplications();
	const matched = pending.filter((a) => textContains(a.username, ctx.rawQ) || textContains(a.reason, ctx.rawQ));

	const deduped = dedupeLatestBy<AccountApplication>(
		matched,
		(a) => normalizeKey(a.username),
		(a) => a.createdAt
	)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		.slice(0, LIMIT);

	return deduped.map((a) => ({
		id: a.id,
		type: 'application' as const,
		title: a.username,
		subtitle: `申请理由: ${a.reason.slice(0, 60)}${a.reason.length > 60 ? '…' : ''}`,
		url: highlightUrl('/dashboard/users', ctx.rawQ),
		matchField: 'username',
		matchText: a.username,
	}));
}
