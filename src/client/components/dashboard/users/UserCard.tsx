import { formatCstDateTime } from '@/lib/timeCst';
import { roleLabel, type Role } from '@/lib/roles';
import { useSearchHighlight } from '@/lib/useSearchHighlight';
import type { ManagedUser } from '@/lib/users/usersClient';

const ROLE_CLASS: Record<Role, string> = {
	user: 'role-user',
	admin: 'role-admin',
	super_admin: 'role-super',
};

type Permissions = {
	canAppointAdmin: boolean;
	canRevokeAdmin: boolean;
	canDisable: boolean;
	canRestoreOrRemove: boolean;
};

type Props = {
	user: ManagedUser;
	busy: boolean;
	permissions: Permissions;
	onAppointAdmin: (id: string) => void;
	onRevokeAdmin: (id: string) => void;
	onDisable: (id: string) => void;
	onEnable: (id: string) => void;
	onRemove: (user: ManagedUser) => void;
};

export function UserCard({ user, busy, permissions, onAppointAdmin, onRevokeAdmin, onDisable, onEnable, onRemove }: Props) {
	const { highlightText } = useSearchHighlight();

	return (
		<div className="users-admin-user-card">
			<div className="users-admin-user-top">
				<div className="users-admin-user-meta">
					<div className="users-admin-user-name">{highlightText(user.username)}</div>
					<div className="users-admin-tags">
						<span className={`users-admin-tag ${ROLE_CLASS[user.role]}`}>{roleLabel(user.role)}</span>
						<span className={`users-admin-tag ${user.status === 'active' ? 'status-active' : 'status-disabled'}`}>
							{user.status === 'active' ? '正常' : '已禁用'}
						</span>
					</div>
				</div>
				<div className="users-admin-actions">
					{permissions.canAppointAdmin && (
						<button className="users-admin-btn primary" disabled={busy} onClick={() => onAppointAdmin(user.id)}>
							授予管理员
						</button>
					)}
					{permissions.canRevokeAdmin && (
						<button className="users-admin-btn" disabled={busy} onClick={() => onRevokeAdmin(user.id)}>
							撤销管理员
						</button>
					)}
					{permissions.canDisable && (
						<button className="users-admin-btn danger" disabled={busy} onClick={() => onDisable(user.id)}>
							禁用
						</button>
					)}
					{permissions.canRestoreOrRemove && (
						<button className="users-admin-btn primary" disabled={busy} onClick={() => onEnable(user.id)}>
							恢复使用
						</button>
					)}
					{permissions.canRestoreOrRemove && (
						<button className="users-admin-btn danger" disabled={busy} onClick={() => onRemove(user)}>
							移除
						</button>
					)}
				</div>
			</div>

			<div className="users-admin-user-foot">
				<span className="users-admin-muted">创建：{formatCstDateTime(user.createdAt)}</span>
				<span className="users-admin-muted">更新：{formatCstDateTime(user.updatedAt)}</span>
			</div>
		</div>
	);
}
