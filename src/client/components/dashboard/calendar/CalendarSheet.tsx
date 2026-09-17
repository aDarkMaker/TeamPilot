import type { CSSProperties } from 'react';

import { DAY_SPAN_MIN, DAY_START_MIN } from '@/lib/calendar/dateGrid';
import type { BlockLayout } from '@/lib/calendar/blockLayout';
import type { DraftRange } from './types';

type Props = {
	label: string;
	layouts: BlockLayout[];
	draft: DraftRange | null;
	onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerUp: () => void;
	onPickBlock: (layout: BlockLayout) => void;
	highlightText: (text: string | null | undefined) => React.ReactNode;
};

/** One day column: renders the drag-to-create ghost plus the placed schedule blocks */
export function CalendarSheet({ label, layouts, draft, onPointerDown, onPointerMove, onPointerUp, onPickBlock, highlightText }: Props) {
	const draftStart = draft ? Math.min(draft.startMin, draft.endMin) : 0;
	const draftSpan = draft ? Math.max(Math.abs(draft.endMin - draft.startMin), 30) : 0;

	return (
		<div
			className="calendar-sheet"
			data-label={label}
			data-has-items={layouts.length > 0 ? 'true' : 'false'}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			{draft ? (
				<div
					className="calendar-draft-block"
					style={{
						top: `${((draftStart - DAY_START_MIN) / DAY_SPAN_MIN) * 100}%`,
						height: `${(draftSpan / DAY_SPAN_MIN) * 100}%`,
					}}
				/>
			) : null}
			{layouts.map((b) => (
				<CalendarBlock key={b.item.id} layout={b} onPick={() => onPickBlock(b)} highlightText={highlightText} />
			))}
		</div>
	);
}

type BlockProps = {
	layout: BlockLayout;
	onPick: () => void;
	highlightText: (text: string | null | undefined) => React.ReactNode;
};

function CalendarBlock({ layout, onPick, highlightText }: BlockProps) {
	return (
		<div
			className="calendar-block"
			style={
				{
					top: `${layout.top}%`,
					height: `${layout.height}%`,
					left: `${layout.leftPct}%`,
					width: `${layout.widthPct}%`,
				} satisfies CSSProperties
			}
			role="button"
			tabIndex={0}
			onClick={onPick}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') onPick();
			}}
		>
			<div className="calendar-block-title">{highlightText(layout.item.title)}</div>
		</div>
	);
}
