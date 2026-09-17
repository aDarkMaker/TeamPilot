import type { ReactNode } from 'react';
import '@/styles/components/confirm-modal.css';

type Props = {
	open: boolean;
	title: string;
	message: ReactNode;
	confirmLabel?: string;
	/** Blocks every dismissal path while the action is in flight */
	busy?: boolean;
	onCancel: () => void;
	onConfirm: () => void;
};

/** Shared destructive-action confirmation dialog */
export function ConfirmModal({ open, title, message, confirmLabel = '确定', busy = false, onCancel, onConfirm }: Props) {
	if (!open) return null;

	const guard = () => {
		if (!busy) onCancel();
	};

	return (
		<div className="confirm-modal" role="dialog" aria-modal="true" onClick={guard}>
			<div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
				<div className="confirm-modal-head">
					<div className="confirm-modal-title">{title}</div>
					<div className="confirm-modal-actions">
						<button type="button" className="confirm-modal-close" disabled={busy} onClick={guard} aria-label="关闭">
							×
						</button>
					</div>
				</div>
				<div className="confirm-modal-message err">{message}</div>
				<div className="confirm-modal-actions">
					<button type="button" className="confirm-modal-btn" disabled={busy} onClick={guard}>
						取消
					</button>
					<button type="button" className="confirm-modal-btn danger" disabled={busy} onClick={onConfirm}>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
