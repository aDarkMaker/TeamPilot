import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export type JoinUsSelectOption<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
	options: JoinUsSelectOption<T>[];
	value: T | null;
	placeholder?: string;
	onChange: (value: T) => void;
	disabled?: boolean;
};

type PanelRect = {
	left: number;
	minWidth: number;
	maxHeight: number;
	placement: 'down' | 'up';
	top: number | 'auto';
	bottom: number | 'auto';
};

const PANEL_GAP = 6;
const VIEWPORT_PAD = 8;
const DEFAULT_MAX_HEIGHT = 240;
const MIN_PANEL = 120;

function measurePanel(trigger: HTMLElement): PanelRect {
	const r = trigger.getBoundingClientRect();
	const spaceBelow = window.innerHeight - r.bottom - VIEWPORT_PAD;
	const spaceAbove = r.top - VIEWPORT_PAD;
	const preferUp = spaceBelow < MIN_PANEL || (spaceBelow < DEFAULT_MAX_HEIGHT && spaceAbove > spaceBelow);

	if (preferUp) {
		return {
			left: r.left,
			minWidth: r.width,
			maxHeight: Math.min(DEFAULT_MAX_HEIGHT, Math.max(MIN_PANEL, spaceAbove - PANEL_GAP)),
			placement: 'up',
			top: 'auto',
			bottom: window.innerHeight - r.top + PANEL_GAP,
		};
	}

	return {
		left: r.left,
		minWidth: r.width,
		maxHeight: Math.min(DEFAULT_MAX_HEIGHT, Math.max(MIN_PANEL, spaceBelow - PANEL_GAP)),
		placement: 'down',
		top: r.bottom + PANEL_GAP,
		bottom: 'auto',
	};
}

export default function JoinUsSelect<T extends string | number>(props: Props<T>) {
	const { options, value, placeholder = '请选择', onChange, disabled = false } = props;
	const [open, setOpen] = useState(false);
	const [panel, setPanel] = useState<PanelRect | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!open) {
			setPanel(null);
			return;
		}
		const trigger = triggerRef.current;
		if (!trigger) return;
		const sync = () => setPanel(measurePanel(trigger));
		sync();
		window.addEventListener('resize', sync);
		window.addEventListener('scroll', sync, true);
		return () => {
			window.removeEventListener('resize', sync);
			window.removeEventListener('scroll', sync, true);
		};
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onDocMouseDown = (e: MouseEvent) => {
			const t = e.target as Node;
			if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
			setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', onDocMouseDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocMouseDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const current = options.find((o) => o.value === value);

	const panelStyle: CSSProperties | undefined = panel
		? {
				position: 'fixed',
				top: panel.top,
				bottom: panel.bottom,
				left: panel.left,
				right: 'auto',
				minWidth: panel.minWidth,
				maxHeight: panel.maxHeight,
				zIndex: 3000,
			}
		: undefined;

	const portal =
		open && panel && typeof document !== 'undefined'
			? createPortal(
					<div
						className={`joinus-select-custom-panel is-fixed ${panel.placement === 'up' ? 'is-up' : ''}`}
						style={panelStyle}
						ref={panelRef}
						role="listbox"
					>
						{options.map((o) => (
							<button
								type="button"
								role="option"
								aria-selected={o.value === value}
								key={o.value}
								className={`joinus-select-custom-item ${o.value === value ? 'is-active' : ''}`}
								onClick={() => {
									onChange(o.value);
									setOpen(false);
								}}
							>
								{o.label}
							</button>
						))}
					</div>,
					document.body
				)
			: null;

	return (
		<div className={`joinus-select-custom ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`} ref={rootRef}>
			<button
				type="button"
				ref={triggerRef}
				className="joinus-select-custom-trigger"
				disabled={disabled}
				onClick={() => setOpen((v) => !v)}
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
