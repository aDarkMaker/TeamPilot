import { z } from 'zod';

import type { DB } from '../db';
import { normalizeKey } from '../lib/pinyinSearch';
import { searchApplications } from './search/applicationSearch';
import { searchNewcomers } from './search/newcomerSearch';
import { searchSchedules } from './search/scheduleSearch';
import { searchTasks } from './search/taskSearch';
import { searchUsers } from './search/userSearch';
import type { SearchContext, SearchResultItem } from './search/types';

const searchQuerySchema = z.object({
	q: z.string().trim().min(1).max(50),
});

export type { SearchResultItem } from './search/types';

export class SearchService {
	constructor(private db: DB) {}

	/** Fans out across the five domains and concatenates their results */
	async search(query: unknown): Promise<SearchResultItem[]> {
		const { q: rawQ } = searchQuerySchema.parse(query);
		const ctx: SearchContext = { rawQ, q: normalizeKey(rawQ) };

		// Loading the member list once also feeds the per-user task scan.
		const users = await this.db.listUsers();

		const [tasks, newcomers, applications, schedules] = await Promise.all([
			searchTasks(this.db, users, ctx),
			searchNewcomers(this.db, ctx),
			searchApplications(this.db, ctx),
			searchSchedules(this.db, ctx),
		]);

		return [...searchUsers(users, ctx), ...tasks, ...newcomers, ...applications, ...schedules];
	}
}
