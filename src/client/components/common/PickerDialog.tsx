import type { ReactNode } from 'react';
import '@/styles/components/picker-dialog.css';

type Props = {
	open: boolean;
	/** Enter/leave class from the caller, e.g. 'open' or 'closing' */
	stateClass: string;
	title: ReactNode;
	headerAction?: ReactNode;
	onClose: () => void;
	/** The list of options */
	children: ReactNode;
};

/** Scrollable option-list dialog (birthday fields, schedule start/end time) */
export function PickerDialog({ open, stateClass, title, headerAction, onClose, children }: Props) {
	if (!open) return null;

	return (
		<div className={`time-picker ${stateClass}`} role="dialog" aria-modal="true" onClick={onClose}>
			<div className="time-picker-card" onClick={(e) => e.stopPropagation()}>
				<div className="time-picker-head">
					<div className="time-picker-title">{title}</div>
					{headerAction}
				</div>
				<div className="time-picker-list">{children}</div>
			</div>
		</div>
	);
}
