import { z } from "zod";
import type { DB } from "../db";
import { AppError } from "../types/api";
import { verifyPassword } from "../auth/password";
import { signAccessToken } from "../auth/jwt";

const loginSchema = z.object({
    username: z.string().min(1).max(50),
    password: z.string().min(8).max(128),
});

export class AuthService {
    constructor(private db: DB) {}

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

        const token = signAccessToken({
            sub: user.id,
            username: user.username,
            role: user.role,
        });

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
        };
    }
}