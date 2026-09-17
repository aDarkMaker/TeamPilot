import { AddWindowToolbar } from './AddWindowToolbar';
import { windowRangeLabel } from '@/lib/interview/timeslots';
import type { InterviewWindow, WindowDraft } from '@/lib/interview/timeslots';

type Props = {
	windows: InterviewWindow[];
	draft: WindowDraft;
	onDraftChange: (patch: Partial<WindowDraft>) => void;
	conflict: InterviewWindow | null;
	addBusy: boolean;
	deleteBusyId: string | null;
	onAdd: () => void;
	onDelete: (windowId: string) => void;
};

/** Interview slot list plus the add toolbar; online and offline share the same slots */
export function InterviewWindowSection({
	windows,
	draft,
	onDraftChange,
	conflict,
	addBusy,
	deleteBusyId,
	onAdd,
	onDelete,
}: Props) {
	return (
		<section className="joinus-form-admin-card">
			<div className="joinus-form-admin-card-head">
				<h2>面试排期</h2>
			</div>
			<div className="joinus-schedule-mode">
				<div className="joinus-schedule-mode-head">
					<h3>线上 / 线下共用时段</h3>
					<span className="joinus-schedule-mode-trigger">15 分钟 / 1 人，线上与线下不分开设置</span>
				</div>
				<div className="joinus-schedule-windows">
					{windows.map((w) => (
						<div key={w.id} className="joinus-schedule-window">
							<span className="joinus-schedule-window-range">{windowRangeLabel(w)}</span>
							<span className={`joinus-schedule-window-count ${w.booked > 0 ? 'is-booked' : ''}`}>
								{w.booked > 0 ? `已约 ${w.booked}/${w.total}` : `可约 ${w.total}`}
							</span>
							<button
								type="button"
								className="joinus-form-admin-btn danger small"
								disabled={w.booked > 0 || deleteBusyId === w.id}
								title={w.booked > 0 ? '已有报名预约，不可删除' : undefined}
								onClick={() => onDelete(w.id)}
							>
								{deleteBusyId === w.id ? '删除中…' : '删除'}
							</button>
						</div>
					))}
					{windows.length === 0 ? <p className="joinus-schedule-empty">还没有设置可约时间</p> : null}
				</div>
				<AddWindowToolbar
					draft={draft}
					onDraftChange={onDraftChange}
					conflict={conflict}
					conflictLabel={windowRangeLabel}
					busy={addBusy}
					onAdd={onAdd}
				/>
			</div>
		</section>
	);
}
