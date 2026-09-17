import { useRef, useState, type CSSProperties } from 'react';

import { layoutDayBlocks, type BlockLayout } from '@/lib/calendar/blockLayout';
import { DAY_END_MIN, DAY_START_MIN, END_HOUR, START_HOUR, STEP_MINUTES, clamp, isSameYmd, type Ymd } from '@/lib/calendar/dateGrid';
import { minuteFromClientY } from '@/lib/calendar/timeGrid';
import type { ScheduleDayItem } from '@/lib/scheduleStore';
import { useIsoLayoutEffect } from '@/lib/useIsoLayoutEffect';
import { CalendarSheet } from './CalendarSheet';
import type { DraftRange } from './types';

type DayKey = { ymd: Ymd; key: string; label: string };

type Props = {
	dayKeys: DayKey[];
	rowsByDay: Record<string, ScheduleDayItem[]>;
	activeDayIdx: number;
	weekDir: 'prev' | 'next' | null;
	selectedYmd: Ymd;
	draftRange: DraftRange | null;
	onSelectDay: (ymd: Ymd) => void;
	onDraftChange: (draft: DraftRange | null) => void;
	onDraftCommit: (day: Ymd, startMin: number, endMin: number) => void;
	onPickBlock: (layout: BlockLayout) => void;
	highlightText: (text: string | null | undefined) => React.ReactNode;
};

type PillRect = { left: number; top: number; width: number; height: number };

/** Week header + timeline grid with drag-to-create day columns */
export function WeekGrid({
	dayKeys,
	rowsByDay,
	activeDayIdx,
	weekDir,
	selectedYmd,
	draftRange,
	onSelectDay,
	onDraftChange,
	onDraftCommit,
	onPickBlock,
	highlightText,
}: Props) {
	const weekHeadRef = useRef<HTMLDivElement | null>(null);
	const dayBtnRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const [dayPill, setDayPill] = useState<PillRect | null>(null);

	useIsoLayoutEffect(() => {
		const el = dayBtnRefs.current[activeDayIdx];
		if (!el) {
			setDayPill(null);
			return;
		}
		// offsetLeft/offsetTop ignore CSS transforms, so the week-entry animation
		// on the buttons cannot skew the measurement.
		const sync = () => setDayPill({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
		sync();
		window.addEventListener('resize', sync);
		return () => window.removeEventListener('resize', sync);
	}, [activeDayIdx, dayKeys]);

	const layoutsByDay: Record<string, BlockLayout[]> = {};
	let total = 0;
	for (const d of dayKeys) {
		const rows = rowsByDay[d.key] ?? [];
		total += rows.length;
		layoutsByDay[d.key] = layoutDayBlocks(rows);
	}

	return (
		<section className="calendar-card">
			<div className="calendar-card-head">
				<h2>日程</h2>
				<div className="calendar-sub">{total} 条</div>
			</div>
			<div className="calendar-week" data-dir={weekDir ?? undefined}>
				<div className="calendar-week-head" ref={weekHeadRef}>
					{dayPill ? (
						<span
							className="calendar-week-pill"
							aria-hidden
							style={{
								width: dayPill.width,
								height: dayPill.height,
								transform: `translate3d(${dayPill.left}px, ${dayPill.top}px, 0)`,
							}}
						/>
					) : null}
					<div className="calendar-week-head-left" />
					{dayKeys.map((d, i) => (
						<button
							key={d.key}
							ref={(el) => {
								dayBtnRefs.current[i] = el;
							}}
							type="button"
							style={{ '--cal-i': i } as CSSProperties}
							className={`calendar-week-day ${isSameYmd(d.ymd, selectedYmd) ? 'active' : ''}`}
							onClick={() => onSelectDay(d.ymd)}
						>
							{d.label}
						</button>
					))}
				</div>
				<div className="calendar-week-body">
					<div className="calendar-timeline">
						{Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
							<div key={i} className="calendar-time">
								{String(i + START_HOUR).padStart(2, '0')}:00
							</div>
						))}
					</div>
					<div className="calendar-week-grid">
						{dayKeys.map((d) => (
							<CalendarSheet
								key={d.key}
								label={d.label}
								layouts={layoutsByDay[d.key] ?? []}
								draft={draftRange?.active && draftRange.dayKey === d.key ? draftRange : null}
								onPointerDown={(e) => {
									if ((e.target as HTMLElement).closest('.calendar-block')) return;
									const start = minuteFromClientY(e.currentTarget, e.clientY);
									onDraftChange({
										dayKey: d.key,
										day: d.ymd,
										startMin: start,
										endMin: clamp(start + STEP_MINUTES, DAY_START_MIN, DAY_END_MIN),
										active: true,
									});
								}}
								onPointerMove={(e) => {
									if (!draftRange?.active || draftRange.dayKey !== d.key) return;
									const cur = minuteFromClientY(e.currentTarget, e.clientY);
									onDraftChange({ ...draftRange, endMin: cur });
								}}
								onPointerUp={() => {
									if (!draftRange?.active || draftRange.dayKey !== d.key) return;
									onDraftCommit(
										d.ymd,
										Math.min(draftRange.startMin, draftRange.endMin),
										Math.max(draftRange.startMin, draftRange.endMin)
									);
									onDraftChange(null);
								}}
								onPickBlock={onPickBlock}
								highlightText={highlightText}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
