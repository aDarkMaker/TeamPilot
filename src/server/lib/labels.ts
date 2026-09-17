/** Display labels for DTO assembly */

const ROLE_LABELS: Record<string, string> = {
	super_admin: '超级管理员',
	admin: '管理员',
	user: '用户',
};

const TASK_STATUS_LABELS: Record<string, string> = {
	pending: '待接受',
	accepted: '已接受',
	leave: '已请假',
};

export function roleLabel(role: string): string {
	return ROLE_LABELS[role] ?? role;
}

export function taskStatusLabel(status: string): string {
	return TASK_STATUS_LABELS[status] ?? status;
}
