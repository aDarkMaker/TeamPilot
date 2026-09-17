import { useEffect } from 'react';

import type { ScheduleDayItem } from '@/lib/scheduleStore';

type Props = {
	detail: ScheduleDayItem | null;
	closing: boolean;
	meId: string | null;
	onClose: () => void;
	onEdit: (item: ScheduleDayItem) => void;
	onCancel: (id: string) => void;
	highlightText: (text: string | null | undefined) => React.ReactNode;
};

export function ScheduleDetailModal({ detail, closing, meId, onClose, onEdit, onCancel, highlightText }: Props) {
	useEffect(() => {
		if (!detail) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !closing) onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [detail, closing, onClose]);

	if (!detail) return null;

	const isOwner = Boolean(meId && detail.createdBy && meId === detail.createdBy);

	return (
		<div className={`calendar-modal ${closing ? 'closing' : 'open'}`} role="dialog" aria-modal="true" onClick={onClose}>
			<div className="calendar-modal-card" onClick={(e) => e.stopPropagation()}>
				<div className="calendar-modal-head">
					<div className="calendar-modal-title">详情</div>
					<div className="calendar-modal-head-actions">
						{isOwner ? (
							<button type="button" className="dash-btn danger" onClick={() => onCancel(detail.id)}>
								取消
							</button>
						) : null}
						{isOwner ? (
							<button type="button" className="dash-btn" onClick={() => onEdit(detail)}>
								编辑
							</button>
						) : null}
						<button type="button" className="dash-btn" onClick={onClose}>
							关闭
						</button>
					</div>
				</div>
				<div className="calendar-detail">
					<div className="calendar-detail-title">{highlightText(detail.title)}</div>
					<div className="calendar-detail-line">
						<span className="pill">
							{detail.startAt} ～ {detail.endAt}
						</span>
						{detail.location ? <span className="pill">{highlightText(detail.location)}</span> : null}
						<span className="pill">{detail.durationMinutes} 分钟</span>
					</div>
					{detail.participants?.length ? (
						<div className="calendar-detail-people">
							{detail.participants.map((p) => (
								<div key={p.userId} className={`calendar-person ${p.taskStatus === 'leave' ? 'is-leave' : ''}`}>
									<span className="calendar-person-avatar">
										{p.avatarUrl ? <img className="calendar-person-img" src={p.avatarUrl} alt="" decoding="async" loading="lazy" width={28} height={28} /> : null}
										<span className="calendar-person-fallback">{p.username.slice(0, 1)}</span>
									</span>
									<span className="calendar-person-name">{p.username}</span>
									{p.taskStatus === 'leave' ? <span className="calendar-person-tag leave">已请假</span> : null}
								</div>
							))}
						</div>
					) : null}
					{detail.description ? <div className="calendar-detail-desc">{highlightText(detail.description)}</div> : null}
				</div>
			</div>
		</div>
	);
}
