import type { DB } from '../../db';
import type { Schedule } from '../../types/schedule';
import { dedupeLatestBy } from '../../lib/dedupeLatest';
import { getShanghaiYearMonth } from '../../lib/shanghaiTime';
import { textContains } from './textContains';
import { highlightUrl, type SearchContext, type SearchResultItem } from './types';

const LIMIT = 3;

/** Only the current (Asia/Shanghai) month is scanned, matching the calendar's default view */
export async function searchSchedules(db: DB, ctx: SearchContext): Promise<SearchResultItem[]> {
	const { year, month } = getShanghaiYearMonth();
	const monthSchedules = await db.listSchedulesByMonth({ year, month });

	const matched: Schedule[] = monthSchedules.filter(
		(s) => textContains(s.title, ctx.rawQ) || textContains(s.description, ctx.rawQ) || textContains(s.location, ctx.rawQ)
	);

	const deduped = dedupeLatestBy<Schedule>(
		matched,
		(s) => s.id,
		(s) => s.updatedAt
	)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, LIMIT);

	return deduped.map((s) => {
		const dateStr = `${s.year}/${String(s.month).padStart(2, '0')}/${String(s.day).padStart(2, '0')}`;
		const locStr = s.location ? ` · ${s.location}` : '';
		return {
			id: s.id,
			type: 'schedule' as const,
			title: s.title,
			subtitle: `${dateStr} ${s.startAt}-${s.endAt}${locStr}`,
			url: highlightUrl('/dashboard/calendar', ctx.rawQ),
			matchField: 'title',
			matchText: s.title,
		};
	});
}
