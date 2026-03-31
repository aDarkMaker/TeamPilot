import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import {
	pendingApplicationsStore,
	broadcastApplicationsUpdated,
	type PendingApplication,
} from '../../lib/pendingApplicationsStore';
import { DashboardToast, useDashboardToast } from './DashboardToast';
import { formatCstDateTime } from '../../lib/timeCst';

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
	const toast = useDashboardToast();

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
				broadcastApplicationsUpdated();
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

	const canDisable = (target: UserRow) => {
		if (!isAdminAbove) return false;
		if (target.role === 'super_admin') return false;
		if (me?.role === 'admin') return target.role === 'user';
		return true;
	};

	const canAppointAdmin = (target: UserRow) => isSuper && target.role === 'user';
	const canRevokeAdmin = (target: UserRow) => isSuper && target.role === 'admin';

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
										<td className="users-admin-strong">{a.username}</td>
										<td className="users-admin-reason">{a.reason}</td>
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
									<div className="users-admin-user-name">{u.username}</div>
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
