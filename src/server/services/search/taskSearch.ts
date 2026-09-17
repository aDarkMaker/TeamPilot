import type { DB } from '../../db';
import type { TaskCard } from '../../types/task';
import { dedupeLatestBy } from '../../lib/dedupeLatest';
import { taskStatusLabel } from '../../lib/labels';
import { textContains } from './textContains';
import { highlightUrl, type SearchContext, type SearchResultItem } from './types';

const LIMIT = 5;
const TASKS_PER_USER = 50;

/**
 * Task cards are denormalised per target user, so the same source schedule produces
 * several rows; collapse them to the newest decision per (sourceType, sourceId).
 */
export async function searchTasks(db: DB, users: Array<{ id: string }>, ctx: SearchContext): Promise<SearchResultItem[]> {
	const allTasks: TaskCard[] = [];
	for (const u of users) {
		allTasks.push(...(await db.listTaskCardsByUser({ targetUserId: u.id, limit: TASKS_PER_USER })));
	}

	const matched = dedupeLatestBy(
		allTasks.filter((t) => textContains(t.title, ctx.rawQ) || textContains(t.content, ctx.rawQ)),
		(t) => `${t.sourceType}:${t.sourceId}`,
		(t) => `${t.updatedAt}|${t.createdAt}`
	)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, LIMIT);

	return matched.map((t) => {
		const matchInTitle = textContains(t.title, ctx.rawQ);
		return {
			id: t.id,
			type: 'task' as const,
			title: t.title,
			subtitle: taskStatusLabel(t.status) + (t.decidedAt ? '' : ' · 待处理'),
			url: highlightUrl('/dashboard/list', ctx.rawQ),
			matchField: matchInTitle ? 'title' : 'content',
			matchText: matchInTitle ? t.title : (t.content ?? ''),
		};
	});
}
