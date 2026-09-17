import { COUNT_OPTIONS, DATE_PICKER_OPTIONS, START_TIME_OPTIONS, draftEndMin, minutesToTime } from '@/lib/interview/timeslots';
import type { InterviewWindow, WindowDraft } from '@/lib/interview/timeslots';
import AnchoredSelect from '@/components/common/AnchoredSelect';

type Props = {
	draft: WindowDraft;
	onDraftChange: (patch: Partial<WindowDraft>) => void;
	/** Overlapping window when the draft collides with an existing slot */
	conflict: InterviewWindow | null;
	conflictLabel: (w: InterviewWindow) => string;
	busy: boolean;
	onAdd: () => void;
};

/** Date / start time / slot count pickers plus the add button */
export function AddWindowToolbar({ draft, onDraftChange, conflict, conflictLabel, busy, onAdd }: Props) {
	const end = draftEndMin(draft);

	return (
		<div className="joinus-schedule-add">
			<AnchoredSelect options={DATE_PICKER_OPTIONS} value={draft.date || null} placeholder="日期" onChange={(v) => onDraftChange({ date: v })} />
			<AnchoredSelect options={START_TIME_OPTIONS} value={draft.startMin} placeholder="开始" onChange={(v) => onDraftChange({ startMin: v })} />
			<AnchoredSelect options={COUNT_OPTIONS} value={draft.count} placeholder="段数" onChange={(v) => onDraftChange({ count: v })} />
			<button
				type="button"
				className="joinus-form-admin-btn small"
				disabled={busy || conflict !== null}
				title={conflict ? '与已有排期重叠' : undefined}
				onClick={onAdd}
			>
				{busy ? '添加中…' : '添加'}
			</button>
			{conflict ? (
				<span className="joinus-schedule-add-hint is-error">与 {conflictLabel(conflict)} 重叠，无法添加</span>
			) : draft.startMin != null && end != null ? (
				<span className="joinus-schedule-add-hint">
					15 分钟/段 · 共 {draft.count} 段 · {minutesToTime(draft.startMin)}-{minutesToTime(end)}
				</span>
			) : null}
		</div>
	);
}
