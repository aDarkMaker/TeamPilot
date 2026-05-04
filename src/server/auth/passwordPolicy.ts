import { z } from 'zod';

export const LEGACY_PASSWORD_RESET = 'HXK135790';

export function isPasswordPolicyCompliant(password: string): boolean {
	return /^[\x21-\x7E]{8,128}$/.test(password);
}

export const passwordPlainSchema = z
	.string()
	.min(8)
	.max(128)
	.refine(isPasswordPolicyCompliant, {
		message: '密码须为 8～128 位 ASCII 可打印字符，不能含空格或中文',
	});
