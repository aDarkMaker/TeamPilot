import type { Database } from 'bun:sqlite';

import type { DB } from './contract';
import { createApplicationsRepo } from './repos/applications.repo';
import { createHomeRepo } from './repos/home.repo';
import { createInterviewsRepo } from './repos/interviews.repo';
import { createRecruitmentRepo } from './repos/recruitment.repo';
import { createSchedulesRepo } from './repos/schedules.repo';
import { createTasksRepo } from './repos/tasks.repo';
import { createUsersRepo } from './repos/users.repo';

export type { Cache, DB } from './contract';
export { createCache } from './cache';

/** Composition root: each repo owns one cluster of tables. */
export function createDb(sqlite: Database): DB {
	return {
		...createUsersRepo(sqlite),
		...createApplicationsRepo(sqlite),
		...createHomeRepo(sqlite),
		...createSchedulesRepo(sqlite),
		...createRecruitmentRepo(sqlite),
		...createTasksRepo(sqlite),
		...createInterviewsRepo(sqlite),
	};
}
