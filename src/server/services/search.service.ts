import { z } from 'zod';
import type { DB } from '../db';
import type { AccountApplication } from '../types/application';
import type { RecruitmentApplication } from '../types/recruitment';
import type { Schedule } from '../types/schedule';
import { pinyin } from 'pinyin-pro';

const searchQuerySchema = z.object({
	q: z.string().trim().min(1).max(50),
});

export type SearchResultItem = {
	id: string;
	type: 'user' | 'task' | 'newcomer' | 'application' | 'schedule';
	title: string;
	subtitle: string;
	url: string;
	matchField: string;
	matchText: string;
};

export class SearchService {
	constructor(private db: DB) {}

	private normalizeKey(s: string): string {
		return s.trim().toLowerCase().replace(/\s+/g, '');
	}

	private pinyinTokens(raw: string): { full: string; initials: string } {
		const normalized = this.normalizeKey(raw);
		if (!normalized) return { full: '', initials: '' };
		const full = this.normalizeKey(
			pinyin(normalized, {
				toneType: 'none',
				type: 'string',
				separator: '',
				nonZh: 'removed',
			}),
		);
		const initials = this.normalizeKey(
			pinyin(normalized, {
				toneType: 'none',
				pattern: 'first',
				type: 'string',
				separator: '',
				nonZh: 'removed',
			}),
		);
		return { full, initials };
	}

	private matchesUser(q: string, u: { username: string; nickname: string | null }): boolean {
		const k1 = this.normalizeKey(u.username);
		const k2 = this.normalizeKey(u.nickname ?? '');
		const display = (u.nickname?.trim() || u.username || '').trim();
		const k3 = this.normalizeKey(display);

		const { full, initials } = this.pinyinTokens(display);
		const { full: full2, initials: initials2 } = this.pinyinTokens(u.username);
		const { full: full3, initials: initials3 } = this.pinyinTokens(u.nickname ?? '');

		const candidates: string[] = [k1, k2, k3, full, initials, full2, initials2, full3, initials3];
		return candidates.some((c) => c.length > 0 && c.includes(q));
	}

	private textContains(text: string | null | undefined, keyword: string): boolean {
		if (!text) return false;
		return text.toLowerCase().includes(keyword.toLowerCase());
	}

	/** 同一来源任务派发给多人时多行 task_cards，搜索只保留更新时间最新的一条 */
	private dedupeTaskCardsBySource<
		T extends { sourceType: string; sourceId: string; updatedAt: string; createdAt: string },
	>(tasks: T[]): T[] {
		const map = new Map<string, T>();
		for (const t of tasks) {
			const key = `${t.sourceType}:${t.sourceId}`;
			const prev = map.get(key);
			if (
				!prev ||
				t.updatedAt > prev.updatedAt ||
				(t.updatedAt === prev.updatedAt && t.createdAt > prev.createdAt)
			) {
				map.set(key, t);
			}
		}
		return [...map.values()];
	}

	/** 同人多次投递（姓名+联系方式相同）只保留最新一条申请 */
	private dedupeRecruitmentByIdentity(apps: RecruitmentApplication[]): RecruitmentApplication[] {
		const map = new Map<string, RecruitmentApplication>();
		for (const a of apps) {
			const key = `${this.normalizeKey(a.fullName)}|${this.normalizeKey(a.contact)}`;
			const prev = map.get(key);
			if (!prev || a.updatedAt > prev.updatedAt) map.set(key, a);
		}
		return [...map.values()];
	}

	private dedupePendingByUsername(apps: AccountApplication[]): AccountApplication[] {
		const map = new Map<string, AccountApplication>();
		for (const a of apps) {
			const key = this.normalizeKey(a.username);
			const prev = map.get(key);
			if (!prev || a.createdAt > prev.createdAt) map.set(key, a);
		}
		return [...map.values()];
	}

	private dedupeSchedulesById(schedules: Schedule[]): Schedule[] {
		const map = new Map<string, Schedule>();
		for (const s of schedules) {
			const prev = map.get(s.id);
			if (!prev || s.updatedAt > prev.updatedAt) map.set(s.id, s);
		}
		return [...map.values()];
	}

	async search(query: unknown, userId: string): Promise<SearchResultItem[]> {
		const { q: rawQ } = searchQuerySchema.parse(query);
		const q = this.normalizeKey(rawQ);

		const results: SearchResultItem[] = [];

		// ---- 1. 成员 ----
		const allUsers = await this.db.listUsers();
		const matchedUsers = allUsers.filter((u) =>
			this.matchesUser(q, { username: u.username, nickname: u.nickname ?? null }),
		);
		for (const u of matchedUsers.slice(0, 5)) {
			const displayName = u.nickname?.trim() || u.username || '';
			results.push({
				id: u.id,
				type: 'user',
				title: displayName,
				subtitle: `@${u.username} · ${this.roleLabel(u.role)} · ${u.status === 'active' ? '正常' : '已禁用'}`,
				url: `/dashboard/users?highlight=${encodeURIComponent(rawQ)}`,
				matchField: 'username',
				matchText: displayName,
			});
		}

		// ---- 2. 任务 ----
		const allUsersList = await this.db.listUsers();
		const allTasks: Awaited<ReturnType<DB['listTaskCardsByUser']>> = [];
		for (const u of allUsersList) {
			const tasks = await this.db.listTaskCardsByUser({ targetUserId: u.id, limit: 50 });
			allTasks.push(...tasks);
		}
		const matchedTasks = this.dedupeTaskCardsBySource(
			allTasks.filter((t) => this.textContains(t.title, rawQ) || this.textContains(t.content, rawQ)),
		).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
		for (const t of matchedTasks.slice(0, 5)) {
			const matchInTitle = this.textContains(t.title, rawQ);
			results.push({
				id: t.id,
				type: 'task',
				title: t.title,
				subtitle: this.taskStatusLabel(t.status) + (t.decidedAt ? '' : ' · 待处理'),
				url: `/dashboard/list?highlight=${encodeURIComponent(rawQ)}`,
				matchField: matchInTitle ? 'title' : 'content',
				matchText: matchInTitle ? t.title : (t.content ?? ''),
			});
		}

		// ---- 3. 新人 ----
		const allRecruitment = await this.db.listRecruitmentApplications({ timeOrder: 'desc' });
		const matchedNewcomers: RecruitmentApplication[] = [];
		for (const a of allRecruitment) {
			if (
				this.textContains(a.fullName, rawQ) ||
				this.textContains(a.contact, rawQ) ||
				this.textContains(a.schoolCollege, rawQ) ||
				this.textContains(a.introMarkdown, rawQ)
			) {
				matchedNewcomers.push(a);
			}
		}
		for (const nc of this.dedupeRecruitmentByIdentity(matchedNewcomers)
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
			.slice(0, 5)) {
			const gradeText = nc.grade ? `${nc.grade}级 · ` : '';
			results.push({
				id: nc.id,
				type: 'newcomer',
				title: nc.fullName,
				subtitle: `${nc.department} · ${gradeText}${nc.schoolCollege ?? ''}`,
				url: `/dashboard/newcomers?highlight=${encodeURIComponent(rawQ)}`,
				matchField: 'fullName',
				matchText: nc.fullName,
			});
		}

		// ---- 4. 待审批申请 ----
		const pendingApps = await this.db.findPendingApplications();
		const matchedApps = pendingApps.filter(
			(a) => this.textContains(a.username, rawQ) || this.textContains(a.reason, rawQ),
		);
		for (const a of this.dedupePendingByUsername(matchedApps)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
			.slice(0, 3)) {
			results.push({
				id: a.id,
				type: 'application',
				title: a.username,
				subtitle: `申请理由: ${a.reason.slice(0, 60)}${a.reason.length > 60 ? '…' : ''}`,
				url: `/dashboard/users?highlight=${encodeURIComponent(rawQ)}`,
				matchField: 'username',
				matchText: a.username,
			});
		}

		// ---- 5. 日程 ----
		const shanghaiNow = new Intl.DateTimeFormat('zh-CN', {
			timeZone: 'Asia/Shanghai',
			year: 'numeric',
			month: '2-digit',
		}).formatToParts(new Date());
		const getNum = (type: string) => Number(shanghaiNow.find((p) => p.type === type)?.value ?? 1);
		const thisYear = getNum('year');
		const thisMonth = getNum('month');
		const monthSchedules = await this.db.listSchedulesByMonth({ year: thisYear, month: thisMonth });
		const matchedSchedules: Schedule[] = [];
		for (const s of monthSchedules) {
			if (
				this.textContains(s.title, rawQ) ||
				this.textContains(s.description, rawQ) ||
				this.textContains(s.location, rawQ)
			) {
				matchedSchedules.push(s);
			}
		}
		for (const s of this.dedupeSchedulesById(matchedSchedules)
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
			.slice(0, 3)) {
			const dateStr = `${s.year}/${String(s.month).padStart(2, '0')}/${String(s.day).padStart(2, '0')}`;
			const locStr = s.location ? ` · ${s.location}` : '';
			results.push({
				id: s.id,
				type: 'schedule',
				title: s.title,
				subtitle: `${dateStr} ${s.startAt}-${s.endAt}${locStr}`,
				url: `/dashboard/calendar?highlight=${encodeURIComponent(rawQ)}`,
				matchField: 'title',
				matchText: s.title,
			});
		}

		return results;
	}

	private roleLabel(role: string): string {
		const map: Record<string, string> = {
			super_admin: '超级管理员',
			admin: '管理员',
			user: '用户',
		};
		return map[role] ?? role;
	}

	private taskStatusLabel(status: string): string {
		const map: Record<string, string> = {
			pending: '待接受',
			accepted: '已接受',
			leave: '已请假',
		};
		return map[status] ?? status;
	}
}
