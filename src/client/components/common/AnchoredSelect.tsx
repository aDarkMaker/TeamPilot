import { type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useAnchoredPanel, type AnchoredPanelRect } from '@/lib/useAnchoredPanel';

export type AnchoredSelectOption<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
	options: AnchoredSelectOption<T>[];
	value: T | null;
	placeholder?: string;
	onChange: (value: T) => void;
	disabled?: boolean;
};

const PANEL_GAP = 6;
const VIEWPORT_PAD = 8;
const DEFAULT_MAX_HEIGHT = 240;
const MIN_PANEL = 120;

function measurePanel(trigger: HTMLElement): AnchoredPanelRect {
	const r = trigger.getBoundingClientRect();
	const spaceBelow = window.innerHeight - r.bottom - VIEWPORT_PAD;
	const spaceAbove = r.top - VIEWPORT_PAD;
	const preferUp = spaceBelow < MIN_PANEL || (spaceBelow < DEFAULT_MAX_HEIGHT && spaceAbove > spaceBelow);

	if (preferUp) {
		return {
			left: r.left,
			width: r.width,
			maxHeight: Math.min(DEFAULT_MAX_HEIGHT, Math.max(MIN_PANEL, spaceAbove - PANEL_GAP)),
			placement: 'up',
			top: 'auto',
			bottom: window.innerHeight - r.top + PANEL_GAP,
		};
	}

	return {
		left: r.left,
		width: r.width,
		maxHeight: Math.min(DEFAULT_MAX_HEIGHT, Math.max(MIN_PANEL, spaceBelow - PANEL_GAP)),
		placement: 'down',
		top: r.bottom + PANEL_GAP,
		bottom: 'auto',
	};
}

export default function AnchoredSelect<T extends string | number>(props: Props<T>) {
	const { options, value, placeholder = '请选择', onChange, disabled = false } = props;
	const { open, rect, rootRef, triggerRef, setPanelEl, toggle, requestClose } = useAnchoredPanel({
		leaveClass: 'is-leave',
		measure: measurePanel,
	});

	const current = options.find((o) => o.value === value);

	const panelStyle: CSSProperties | undefined = rect
		? {
				position: 'fixed',
				top: rect.top,
				bottom: rect.bottom,
				left: rect.left,
				right: 'auto',
				width: rect.width,
				maxHeight: rect.maxHeight,
				zIndex: 3000,
			}
		: undefined;

	const portal =
		rect && typeof document !== 'undefined'
			? (createPortal(
					<div
						className={`joinus-select-custom-panel is-fixed ${rect.placement === 'up' ? 'is-up' : ''}`}
						style={panelStyle}
						ref={setPanelEl}
					>
						<div className="joinus-select-custom-list" role="listbox">
							{options.map((o) => (
								<button
									type="button"
									role="option"
									aria-selected={o.value === value}
									key={o.value}
									className={`joinus-select-custom-item ${o.value === value ? 'is-active' : ''}`}
									onClick={() => {
										onChange(o.value);
										requestClose();
									}}
								>
									{o.label}
								</button>
							))}
						</div>
					</div>,
					document.body
				) as ReactNode)
			: null;

	return (
		<div className={`joinus-select-custom ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`} ref={rootRef}>
			<button
				type="button"
				ref={triggerRef}
				className="joinus-select-custom-trigger"
				disabled={disabled}
				onClick={toggle}
				aria-haspopup="listbox"
				aria-expanded={open}
			>
				<span className={`joinus-select-custom-value ${current ? '' : 'is-placeholder'}`}>{current ? current.label : placeholder}</span>
				<span className="joinus-select-custom-arrow" aria-hidden="true" />
			</button>
			{portal}
		</div>
	);
}
