import { z } from 'zod';

import type { DB } from '../db';
import type { BirthdayWish } from '../types/home';
import { AppError } from '../types/api';
import { toPublicWebpUrl } from '../lib/mediaUrl';
import { getShanghaiYmd } from '../lib/shanghaiTime';

const createWishSchema = z.object({
	recipientUserId: z.string().trim().min(1),
	message: z.string().trim().min(1).max(120),
});

export class BirthdayService {
	constructor(private db: DB) {}

	private toDay(): { ymd: string; month: number; day: number } {
		const [y, m, d] = getShanghaiYmd().split('-');
		return { ymd: `${y}-${m}-${d}`, month: Number(m), day: Number(d) };
	}

	private toWishDto(w: BirthdayWish) {
		return {
			id: w.id,
			message: w.message,
			createdAt: w.createdAt,
			author: {
				id: w.authorId,
				username: w.authorUsername,
				nickname: w.authorNickname,
				avatarUrl: toPublicWebpUrl(w.authorAvatarPath),
			},
		};
	}

	async listTodayBirthdays() {
		const { month, day, ymd } = this.toDay();
		const users = await this.db.listUsersByBirthday({ month, day });
		return {
			ymd,
			users: users.map((u) => ({
				id: u.id,
				username: u.username,
				nickname: u.nickname,
				avatarUrl: toPublicWebpUrl(u.avatarPath),
			})),
		};
	}

	async listWishes(recipientUserId: string) {
		const { ymd } = this.toDay();
		const rows = await this.db.listBirthdayWishes({ recipientUserId, wishDate: ymd });
		return {
			recipientUserId,
			wishDate: ymd,
			items: rows.map((r) => this.toWishDto(r)),
		};
	}

	async createWish(actor: { id: string }, body: unknown) {
		const p = createWishSchema.parse(body);
		const { month, day, ymd } = this.toDay();

		const birthdayUsers = await this.db.listUsersByBirthday({ month, day });
		const isBirthdayToday = birthdayUsers.some((u) => String(u.id) === String(p.recipientUserId));
		if (!isBirthdayToday) throw new AppError(400, 'NOT_BIRTHDAY_TODAY', '今天不是TA的生日哦！');

		try {
			const created = await this.db.createBirthdayWish({
				recipientUserId: p.recipientUserId,
				authorUserId: actor.id,
				message: p.message,
				wishDate: ymd,
			});
			const dto = this.toWishDto(created);
			return { id: dto.id, message: dto.message, author: dto.author };
		} catch (e) {
			const msg = e instanceof Error ? e.message : '';
			if (msg.includes('UNIQUE') || msg.includes('idx_birthday_wishes_unique')) {
				throw new AppError(409, 'ALREADY_WISHED', '祝福弥足珍贵，一次就够啦');
			}
			throw e;
		}
	}
}
