import { z } from "zod";
import type { DB } from "../db";
import { AppError } from "../types/api";
import { verifyPassword, hashPassword } from '../auth/password';
import { signAccessToken } from '../auth/jwt';
import { isPasswordPolicyCompliant, LEGACY_PASSWORD_RESET } from '../auth/passwordPolicy';

const loginSchema = z.object({
    username: z.string().min(1).max(50),
    password: z.string().min(8).max(128),
});

export class AuthService {
    constructor(private db: DB) {}

	private getShanghaiYmd() {
		const parts = new Intl.DateTimeFormat('zh-CN', {
			timeZone: 'Asia/Shanghai',
			hour12: false,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(new Date());
		const get = (type: Intl.DateTimeFormatPartTypes) => String(parts.find((p) => p.type === type)?.value ?? '');
		return `${get('year')}-${get('month')}-${get('day')}`;
	}

	private toTaskStartIso(input: { year: number; month: number; day: number; startAt: string }) {
		const mm = String(input.month).padStart(2, '0');
		const dd = String(input.day).padStart(2, '0');
		return `${input.year}-${mm}-${dd}T${input.startAt}:00`;
	}

	private async syncAllScheduleTasksForUser(user: { id: string }) {
		const allSchedules = await this.db.listAllSchedulesFromDate({ startDate: this.getShanghaiYmd() });
		await Promise.all(
			allSchedules.map((s) =>
				this.db.createOrReplaceTaskCard({
					targetUserId: user.id,
					actorUserId: s.createdBy ?? null,
					sourceType: 'schedule_at',
					sourceId: s.id,
					title: `日程提醒：${s.title}`,
					content: s.description ?? null,
					payloadJson: JSON.stringify({
						startAtIso: this.toTaskStartIso(s),
						year: s.year,
						month: s.month,
						day: s.day,
						startAt: s.startAt,
						endAt: s.endAt,
					}),
				}),
			),
		);
	}

    async login(input: unknown) {
        const parsed = loginSchema.parse(input);

        const user = await this.db.findUserByUsername(parsed.username.trim());
        if (!user) {
            throw new AppError(401, 'INVALID_CREDENTIALS', '没有你这号人物呢！');
        }

        if (user.status !== 'active') {
            throw new AppError(403, 'ACCOUNT_DISABLED', '你怎么被封号了？');
        }

        const ok = await verifyPassword(parsed.password, user.passwordHash);
        if (!ok) {
            throw new AppError(401, 'INVALID_CREDENTIALS', '再想想密码呢～');
        }

		let passwordWasResetToDefault = false;
		if (!isPasswordPolicyCompliant(parsed.password)) {
			const newHash = await hashPassword(LEGACY_PASSWORD_RESET);
			await this.db.updateUserPasswordHash(user.id, newHash);
			passwordWasResetToDefault = true;
		}

		await this.syncAllScheduleTasksForUser({ id: user.id });

        const token = signAccessToken({
            sub: user.id,
            username: user.username,
            role: user.role,
        });

        return {
            token,
            passwordWasResetToDefault,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
        };
    }
}