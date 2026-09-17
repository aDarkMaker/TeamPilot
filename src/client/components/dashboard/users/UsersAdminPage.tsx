import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { pendingApplicationsStore, broadcastApplicationsUpdated, type PendingApplication } from '@/lib/pendingApplicationsStore';
import { usePolling } from '@/lib/usePolling';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { DashboardToast, useDashboardToast } from '@/components/dashboard/shell/DashboardToast';
import { PendingApplicationsTable } from './PendingApplicationsTable';
import { UsersCardGrid } from './UsersCardGrid';
import {
	appointAdmin,
	approveApplication,
	disableUser,
	enableUser,
	fetchCurrentUser,
	fetchPendingApplications,
	fetchUsers,
	rejectApplication,
	removeUser,
	revokeAdmin,
	type CurrentUser,
	type ManagedUser,
} from '@/lib/users/usersClient';

const PENDING_POLL_MS = 8000;

const SERVER_PENDING_SNAPSHOT: { items: PendingApplication[]; updatedAt: number } = {
	items: [],
	updatedAt: 0,
};

const toMessage = (e: unknown) => (e instanceof Error ? e.message : '出了点未知状况');

export default function UsersAdminPage() {
	const [me, setMe] = useState<CurrentUser | null>(null);
	const [users, setUsers] = useState<ManagedUser[]>([]);
	const [err, setErr] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
	const [confirmRemoveTarget, setConfirmRemoveTarget] = useState<{ id: string; username: string } | null>(null);
	const toast = useDashboardToast();

	const pendingState = useSyncExternalStore(pendingApplicationsStore.subscribe, pendingApplicationsStore.getSnapshot, () => SERVER_PENDING_SNAPSHOT);
	const pending = pendingState.items;

	/** Reports a mutation failure through the shared toast channel */
	const report = useCallback((e: unknown) => {
		setErr(toMessage(e));
	}, []);

	useEffect(() => {
		pendingApplicationsStore.hydrateFromStorage();
	}, []);

	// Initial page data: identity, member list and the first pending batch.
	useEffect(() => {
		let disposed = false;
		(async () => {
			try {
				setErr(null);
				const [meData, userRows, pendingRows] = await Promise.all([fetchCurrentUser(), fetchUsers(), fetchPendingApplications()]);
				if (disposed) return;
				setMe(meData);
				setUsers(userRows);
				pendingApplicationsStore.setItems(pendingRows);
			} catch (e) {
				if (!disposed) setErr(toMessage(e));
			}
		})();
		return () => {
			disposed = true;
		};
	}, []);

	// Pending applications refresh on an interval and whenever the tab comes back.
	const refreshPending = useCallback(async () => {
		try {
			pendingApplicationsStore.setItems(await fetchPendingApplications());
		} catch (e) {
			report(e);
		}
	}, [report]);

	usePolling(refreshPending, PENDING_POLL_MS);

	useEffect(() => {
		const onUpdated = () => void refreshPending();
		window.addEventListener('hxk:applications-updated', onUpdated);
		return () => window.removeEventListener('hxk:applications-updated', onUpdated);
	}, [refreshPending]);

	useEffect(() => {
		if (!err) return;
		toast.show({ text: err, type: 'err', durationMs: 3000 });
		setErr(null);
	}, [err, toast]);

	/** Shared busy bookkeeping for the per-row and per-user actions */
	const runAction = useCallback(
		async (id: string, action: () => Promise<void>) => {
			setBusyId(id);
			try {
				await action();
			} catch (e) {
				report(e);
			} finally {
				setBusyId(null);
			}
		},
		[report]
	);

	const approve = (appId: string) =>
		runAction(appId, async () => {
			await approveApplication(appId);
			pendingApplicationsStore.removeById(appId);
			broadcastApplicationsUpdated();
			setUsers(await fetchUsers());
		});

	const reject = (appId: string) =>
		runAction(appId, async () => {
			await rejectApplication(appId);
			pendingApplicationsStore.removeById(appId);
			broadcastApplicationsUpdated();
		});

	const onDisable = (userId: string) =>
		runAction(userId, async () => {
			await disableUser(userId);
			setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'disabled' } : u)));
			toast.show({ text: '已禁用该账号', type: 'ok', durationMs: 3000 });
		});

	const onEnable = (userId: string) =>
		runAction(userId, async () => {
			await enableUser(userId);
			setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u)));
			toast.show({ text: '已恢复该账号', type: 'ok', durationMs: 3000 });
		});

	const onAppointAdmin = (userId: string) =>
		runAction(userId, async () => {
			await appointAdmin(userId);
			setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: 'admin' } : u)));
		});

	const onRevokeAdmin = (userId: string) =>
		runAction(userId, async () => {
			await revokeAdmin(userId);
			setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: 'user' } : u)));
		});

	const openRemoveConfirm = (user: ManagedUser) => {
		setConfirmRemoveTarget({ id: user.id, username: user.username });
		setConfirmRemoveOpen(true);
	};

	const closeRemoveConfirm = () => {
		if (confirmRemoveTarget && busyId === confirmRemoveTarget.id) return;
		setConfirmRemoveOpen(false);
		setConfirmRemoveTarget(null);
	};

	const performRemoveUser = () => {
		if (!confirmRemoveTarget) return;
		const userId = confirmRemoveTarget.id;
		return runAction(userId, async () => {
			await removeUser(userId);
			setUsers((prev) => prev.filter((u) => u.id !== userId));
			toast.show({ text: '已移除该账号', type: 'ok', durationMs: 3000 });
			setConfirmRemoveOpen(false);
			setConfirmRemoveTarget(null);
		});
	};

	return (
		<div className="tc-page users-admin">
			<DashboardToast toast={toast.toast} />
			<div className="tc-page-head">
				<div className="tc-page-head__text">
					<span className="tc-eyebrow">成员</span>
					<h1 className="tc-page-title">成员管理</h1>
				</div>
			</div>
			<ConfirmModal
				open={confirmRemoveOpen && !!confirmRemoveTarget}
				title="确认移除账号"
				message={<>确定删除「{confirmRemoveTarget?.username}」的账号记录？该操作不可撤销。</>}
				confirmLabel="确定移除"
				busy={busyId === confirmRemoveTarget?.id}
				onCancel={closeRemoveConfirm}
				onConfirm={() => void performRemoveUser()}
			/>

			<PendingApplicationsTable pending={pending} busyId={busyId} onApprove={approve} onReject={reject} />

			<UsersCardGrid
				users={users}
				meRole={me?.role}
				busyId={busyId}
				onAppointAdmin={(id) => void onAppointAdmin(id)}
				onRevokeAdmin={(id) => void onRevokeAdmin(id)}
				onDisable={(id) => void onDisable(id)}
				onEnable={(id) => void onEnable(id)}
				onRemove={openRemoveConfirm}
			/>
		</div>
	);
}
