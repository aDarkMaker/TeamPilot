import type { User } from '../../types/user';
import { roleLabel } from '../../lib/labels';
import { matchesUserByQuery } from '../../lib/pinyinSearch';
import { highlightUrl, type SearchContext, type SearchResultItem } from './types';

const LIMIT = 5;

export function searchUsers(users: User[], ctx: SearchContext): SearchResultItem[] {
	return users
		.filter((u) => matchesUserByQuery(ctx.q, { username: u.username, nickname: u.nickname ?? null }))
		.slice(0, LIMIT)
		.map((u) => {
			const displayName = u.nickname?.trim() || u.username || '';
			return {
				id: u.id,
				type: 'user' as const,
				title: displayName,
				subtitle: `@${u.username} · ${roleLabel(u.role)} · ${u.status === 'active' ? '正常' : '已禁用'}`,
				url: highlightUrl('/dashboard/users', ctx.rawQ),
				matchField: 'username',
				matchText: displayName,
			};
		});
}
