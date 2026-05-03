import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import {
	pendingApplicationsStore,
	broadcastApplicationsUpdated,
	type PendingApplication,
} from '../../lib/pendingApplicationsStore';
import { DashboardToast, useDashboardToast } from './DashboardToast';
import { formatCstDateTime } from '../../lib/timeCst';
import { useSearchHighlight } from '../../lib/useSearchHighlight';

type Role = 'user' | 'admin' | 'super_admin';
type Status = 'active' | 'disabled';

type Me = { role: Role; id: string; username: string };
type UserRow = {
	id: string;
	username: string;
	role: Role;
	status: Status;
	createdAt: string;
	updatedAt: string;
};

type AppRow = PendingApplication;

const SERVER_PENDING_SNAPSHOT: {
	items: PendingApplication[];
	updatedAt: number;
} = {
	items: [],
	updatedAt: 0,
};

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
	const res = await fetch(input, { credentials: 'include', ...init });
	const json = await res.json().catch(() => ({}));
	if (!res.ok || !json?.ok) throw new Error(json?.message || json?.code || 'REQUEST_FAILED');
	return json.data as T;
}

export default function UserAdminPage() {
	const [me, setMe] = useState<Me | null>(null);
	const [users, setUsers] = useState<UserRow[]>([]);
	const [err, setErr] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
	const [confirmRemoveTarget, setConfirmRemoveTarget] = useState<{ id: string; username: string } | null>(null);
	const toast = useDashboardToast();
	const { highlightText } = useSearchHighlight();

	const pendingState = useSyncExternalStore(
		pendingApplicationsStore.subscribe,
		pendingApplicationsStore.getSnapshot,
		() => SERVER_PENDING_SNAPSHOT
	);
	const pending = pendingState.items;

	const isSuper = me?.role === 'super_admin';
	const isAdminAbove = me?.role === 'admin' || me?.role === 'super_admin';

	const roleLabel: Record<Role, string> = useMemo(
		() => ({
			user: '用户',
			admin: '管理员',
			super_admin: '超级管理员',
		}),
		[]
	);

	const roleClass: Record<Role, string> = useMemo(
		() => ({
			user: 'role-user',
			admin: 'role-admin',
			super_admin: 'role-super',
		}),
		[]
	);

	useEffect(() => {
		pendingApplicationsStore.hydrateFromStorage();

		let disposed = false;
		let timer: number | null = null;

		const refreshPending = async () => {
			try {
				const p = await api<AppRow[]>('/api/application/pending');
				if (disposed) return;
				pendingApplicationsStore.setItems(p);
			} catch (e) {
				if (disposed) return;
				setErr(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
			}
		};

		(async () => {
			try {
				setErr(null);
				const meData = await api<any>('/api/users/me');
				setMe(meData);
				const [u, p] = await Promise.all([api<UserRow[]>('/api/users'), api<AppRow[]>('/api/application/pending')]);
				setUsers(u);
				pendingApplicationsStore.setItems(p);
			} catch (e) {
				setErr(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
			}
		})();

		const onVisible = () => {
			if (document.visibilityState === 'visible') void refreshPending();
		};

		const onUpdated = () => {
			void refreshPending();
		};

		document.addEventListener('visibilitychange', onVisible);
		window.addEventListener('hxk:applications-updated', onUpdated);

		timer = window.setInterval(() => void refreshPending(), 8000);

		return () => {
			disposed = true;
			document.removeEventListener('visibilitychange', onVisible);
			window.removeEventListener('hxk:applications-updated', onUpdated);
			if (timer) window.clearInterval(timer);
		};
	}, []);

	const canManageNonSuperUser = (target: UserRow) => {
		if (!isAdminAbove) return false;
		if (target.role === 'super_admin') return false;
		if (me?.role === 'admin') return target.role === 'user';
		return true;
	};

	/** 仅正常状态可禁用；已禁用则展示恢复/移除 */
	const canDisable = (target: UserRow) => canManageNonSuperUser(target) && target.status === 'active';
	const canRestoreOrRemove = (target: UserRow) => canManageNonSuperUser(target) && target.status === 'disabled';

	const canAppointAdmin = (target: UserRow) => isSuper && target.role === 'user' && target.status === 'active';
	const canRevokeAdmin = (target: UserRow) => isSuper && target.role === 'admin' && target.status === 'active';

	const approve = async (appId: string) => {
		setBusyId(appId);
		try {
			await api(`/api/application/${appId}/approve`, { method: 'POST' });
			pendingApplicationsStore.removeById(appId);
			broadcastApplicationsUpdated();
			const u = await api<UserRow[]>('/api/users');
			setUsers(u);
		} catch (e) {
			setErr(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
		} finally {
			setBusyId(null);
		}
	};

	const reject = async (appId: string) => {
		setBusyId(appId);
		try {
			await api(`/api/application/${appId}/reject`, { method: 'POST' });
			pendingApplicationsStore.removeById(appId);
			broadcastApplicationsUpdated();
		} catch (e) {
			setErr(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
		} finally {
			setBusyId(null);
		}
	};

	const disableUser = async (userId: string) => {
		setBusyId(userId);
		try {
			await api(`/api/users/${userId}/disable`, { method: 'POST' });
			setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'disabled' } : u)));
			toast.show({ text: '已禁用该账号', type: 'ok', durationMs: 3000 });
		} catch (e) {
			setErr(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
		} finally {
			setBusyId(null);
		}
	};

	const enableUser = async (userId: string) => {
		setBusyId(userId);
		try {
			await api(`/api/users/${userId}/enable`, { method: 'POST' });
			setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u)));
			toast.show({ text: '已恢复该账号', type: 'ok', durationMs: 3000 });
		} catch (e) {
			setErr(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
		} finally {
			setBusyId(null);
		}
	};

	const openRemoveConfirm = (userId: string, username: string) => {
		setConfirmRemoveTarget({ id: userId, username });
		setConfirmRemoveOpen(true);
	};

	const closeRemoveConfirm = () => {
		if (confirmRemoveTarget && busyId === confirmRemoveTarget.id) return;
		setConfirmRemoveOpen(false);
		setConfirmRemoveTarget(null);
	};

	const performRemoveUser = async () => {
		if (!confirmRemoveTarget) return;
		const userId = confirmRemoveTarget.id;
		setBusyId(userId);
		try {
			await api(`/api/users/${userId}`, { method: 'DELETE' });
			setUsers((prev) => prev.filter((u) => u.id !== userId));
			toast.show({ text: '已移除该账号', type: 'ok', durationMs: 3000 });
			setConfirmRemoveOpen(false);
			setConfirmRemoveTarget(null);
		} catch (e) {
			setErr(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
		} finally {
			setBusyId(null);
		}
	};

	const appointAdmin = async (userId: string) => {
		setBusyId(userId);
		try {
			await api(`/api/users/${userId}/appoint-admin`, { method: 'POST' });
			setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: 'admin' } : u)));
		} catch (e) {
			setErr(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
		} finally {
			setBusyId(null);
		}
	};

	const revokeAdmin = async (userId: string) => {
		setBusyId(userId);
		try {
			await api(`/api/users/${userId}/revoke-admin`, { method: 'POST' });
			setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: 'user' } : u)));
		} catch (e) {
			setErr(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
		} finally {
			setBusyId(null);
		}
	};

	const fmt = (iso: string) => {
		return formatCstDateTime(iso);
	};

	useEffect(() => {
		if (!err) return;
		toast.show({ text: err, type: 'err', durationMs: 3000 });
		setErr(null);
	}, [err, toast]);

	return (
		<div className="users-admin">
			<DashboardToast toast={toast.toast} />
			{confirmRemoveOpen && confirmRemoveTarget ? (
				<div className="calendar-modal" role="dialog" aria-modal="true" onClick={closeRemoveConfirm}>
					<div className="calendar-modal-card" onClick={(e) => e.stopPropagation()}>
						<div className="calendar-modal-head">
							<div className="calendar-modal-title">确认移除账号</div>
							<div className="calendar-modal-head-actions">
								<button
									type="button"
									className="users-admin-modal-close"
									disabled={busyId === confirmRemoveTarget.id}
									onClick={closeRemoveConfirm}
									aria-label="关闭"
								>
									×
								</button>
							</div>
						</div>
						<div className="users-admin-msg err" style={{ marginBottom: 12 }}>
							确定删除「{confirmRemoveTarget.username}」的账号记录？该操作不可撤销。
						</div>
						<div className="calendar-modal-head-actions" style={{ justifyContent: 'flex-end' }}>
							<button
								type="button"
								className="users-admin-btn"
								disabled={busyId === confirmRemoveTarget.id}
								onClick={closeRemoveConfirm}
							>
								取消
							</button>
							<button
								type="button"
								className="users-admin-btn danger"
								disabled={busyId === confirmRemoveTarget.id}
								onClick={() => void performRemoveUser()}
								style={{ marginLeft: 10 }}
							>
								确定移除
							</button>
						</div>
					</div>
				</div>
			) : null}

			<section className="users-admin-card">
				<div className="users-admin-card-head">
					<h2>待审批申请</h2>
					<div className="users-admin-card-sub">{pending.length} 条</div>
				</div>

				{pending.length === 0 ? (
					<p className="users-admin-empty">暂无</p>
				) : (
					<div className="users-admin-table-wrap">
						<table className="users-admin-table">
							<thead>
								<tr>
									<th>用户名</th>
									<th>申请理由</th>
									<th>时间</th>
									<th style={{ width: 220 }}>操作</th>
								</tr>
							</thead>
							<tbody>
								{pending.map((a) => (
									<tr key={a.id}>
										<td className="users-admin-strong">{highlightText(a.username)}</td>
										<td className="users-admin-reason">{highlightText(a.reason)}</td>
										<td className="users-admin-muted">{fmt(a.createdAt)}</td>
										<td>
											<div className="users-admin-actions">
												<button
													className="users-admin-btn primary"
													disabled={busyId === a.id}
													onClick={() => void approve(a.id)}
												>
													通过
												</button>
												<button
													className="users-admin-btn danger"
													disabled={busyId === a.id}
													onClick={() => void reject(a.id)}
												>
													驳回
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section className="users-admin-card">
				<div className="users-admin-card-head">
					<h2>成员列表</h2>
					<div className="users-admin-card-sub">{users.length} 人</div>
				</div>

				<div className="users-admin-grid">
					{users.map((u) => (
						<div key={u.id} className="users-admin-user-card">
							<div className="users-admin-user-top">
								<div className="users-admin-user-meta">
									<div className="users-admin-user-name">{highlightText(u.username)}</div>
									<div className="users-admin-tags">
										<span className={`users-admin-tag ${roleClass[u.role]}`}>{roleLabel[u.role]}</span>
										<span className={`users-admin-tag ${u.status === 'active' ? 'status-active' : 'status-disabled'}`}>
											{u.status === 'active' ? '正常' : '已禁用'}
										</span>
									</div>
								</div>
								<div className="users-admin-actions">
									{canAppointAdmin(u) && (
										<button
											className="users-admin-btn primary"
											disabled={busyId === u.id}
											onClick={() => void appointAdmin(u.id)}
										>
											授予管理员
										</button>
									)}
									{canRevokeAdmin(u) && (
										<button
											className="users-admin-btn"
											disabled={busyId === u.id}
											onClick={() => void revokeAdmin(u.id)}
										>
											撤销管理员
										</button>
									)}
									{canDisable(u) && (
										<button
											className="users-admin-btn danger"
											disabled={busyId === u.id}
											onClick={() => void disableUser(u.id)}
										>
											禁用
										</button>
									)}
									{canRestoreOrRemove(u) && (
										<button
											className="users-admin-btn primary"
											disabled={busyId === u.id}
											onClick={() => void enableUser(u.id)}
										>
											恢复使用
										</button>
									)}
									{canRestoreOrRemove(u) && (
										<button
											className="users-admin-btn danger"
											disabled={busyId === u.id}
											onClick={() => openRemoveConfirm(u.id, u.username)}
										>
											移除
										</button>
									)}
								</div>
							</div>

							<div className="users-admin-user-foot">
								<span className="users-admin-muted">创建：{fmt(u.createdAt)}</span>
								<span className="users-admin-muted">更新：{fmt(u.updatedAt)}</span>
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
