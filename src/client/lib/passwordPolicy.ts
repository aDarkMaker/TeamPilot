export function isPasswordPolicyCompliant(password: string): boolean {
	return /^[\x21-\x7E]{8,128}$/.test(password);
}

export const PASSWORD_POLICY_HINT = '密码须为 8～128 位英文/数字/符号（ASCII），不能含空格或中文';

/**
 * Validates a password change before it hits the network.
 * Returns the error text to show the user, or null when the input is acceptable.
 */
export function validatePasswordChange(input: { oldPassword: string; newPassword: string; confirmPassword: string }): string | null {
	const oldPassword = input.oldPassword.trim();
	const newPassword = input.newPassword.trim();

	if (!oldPassword || !newPassword) return '请填写当前密码和新密码';
	if (newPassword !== input.confirmPassword) return '两次输入的密码不一致！';
	if (oldPassword === newPassword) return '一样的密码还要改吗？';
	if (newPassword.length < 8) return '新密码至少 8 位';
	if (!isPasswordPolicyCompliant(newPassword)) return PASSWORD_POLICY_HINT;
	return null;
}
