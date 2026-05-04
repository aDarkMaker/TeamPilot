export function isPasswordPolicyCompliant(password: string): boolean {
	return /^[\x21-\x7E]{8,128}$/.test(password);
}

export const PASSWORD_POLICY_HINT =
	'密码须为 8～128 位英文/数字/符号（ASCII），不能含空格或中文';
