import { formatCstDateTime } from '@/lib/timeCst';
import { useSearchHighlight } from '@/lib/useSearchHighlight';
import type { PendingApplication } from '@/lib/pendingApplicationsStore';

type Props = {
	pending: PendingApplication[];
	busyId: string | null;
	onApprove: (id: string) => Promise<void>;
	onReject: (id: string) => Promise<void>;
};

export function PendingApplicationsTable({ pending, busyId, onApprove, onReject }: Props) {
	const { highlightText } = useSearchHighlight();

	return (
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
									<td className="users-admin-muted">{formatCstDateTime(a.createdAt)}</td>
									<td>
										<div className="users-admin-actions">
											<button className="users-admin-btn primary" disabled={busyId === a.id} onClick={() => void onApprove(a.id)}>
												通过
											</button>
											<button className="users-admin-btn danger" disabled={busyId === a.id} onClick={() => void onReject(a.id)}>
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
	);
}
