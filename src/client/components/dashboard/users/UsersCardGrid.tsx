import { canAppointAdmin, canDisable, canRestoreOrRemove, canRevokeAdmin } from '@/lib/users/userPermissions';
import type { ManagedUser } from '@/lib/users/usersClient';
import type { Role } from '@/lib/roles';
import { UserCard } from './UserCard';

type Props = {
	users: ManagedUser[];
	meRole: Role | null | undefined;
	busyId: string | null;
	onAppointAdmin: (id: string) => void;
	onRevokeAdmin: (id: string) => void;
	onDisable: (id: string) => void;
	onEnable: (id: string) => void;
	onRemove: (user: ManagedUser) => void;
};

export function UsersCardGrid({ users, meRole, busyId, onAppointAdmin, onRevokeAdmin, onDisable, onEnable, onRemove }: Props) {
	return (
		<section className="users-admin-card">
			<div className="users-admin-card-head">
				<h2>成员列表</h2>
				<div className="users-admin-card-sub">{users.length} 人</div>
			</div>

			<div className="users-admin-grid">
				{users.map((u) => (
					<UserCard
						key={u.id}
						user={u}
						busy={busyId === u.id}
						permissions={{
							canAppointAdmin: canAppointAdmin(meRole, u),
							canRevokeAdmin: canRevokeAdmin(meRole, u),
							canDisable: canDisable(meRole, u),
							canRestoreOrRemove: canRestoreOrRemove(meRole, u),
						}}
						onAppointAdmin={onAppointAdmin}
						onRevokeAdmin={onRevokeAdmin}
						onDisable={onDisable}
						onEnable={onEnable}
						onRemove={onRemove}
					/>
				))}
			</div>
		</section>
	);
}
