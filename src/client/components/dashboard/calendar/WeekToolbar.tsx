type Props = {
	dateLabel: string;
	showBackToday: boolean;
	onShiftWeek: (delta: number) => void;
	onBackToday: () => void;
	onAdd: () => void;
};

/** Week navigation header: prev / next arrows, the selected date and the primary actions */
export function WeekToolbar({ dateLabel, showBackToday, onShiftWeek, onBackToday, onAdd }: Props) {
	return (
		<div className="calendar-head">
			<div className="calendar-head-title">
				<button type="button" className="calendar-date-btn" aria-label="上一周" onClick={() => onShiftWeek(-7)}>
					<svg viewBox="0 0 24 24" focusable="false" aria-hidden>
						<path d="M15 5l-7 7 7 7" />
					</svg>
				</button>
				<span>{dateLabel}</span>
				<button type="button" className="calendar-date-btn" aria-label="下一周" onClick={() => onShiftWeek(7)}>
					<svg viewBox="0 0 24 24" focusable="false" aria-hidden>
						<path d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>
			<div className="calendar-head-actions">
				{showBackToday ? (
					<button type="button" className="dash-btn" onClick={onBackToday}>
						返回今日
					</button>
				) : null}
				<button type="button" className="dash-btn primary" onClick={onAdd}>
					添加
				</button>
			</div>
		</div>
	);
}
