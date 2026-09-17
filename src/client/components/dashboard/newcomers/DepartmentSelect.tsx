import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from '@/lib/recruitment/departmentLabels';
import { useAnchoredPanel, type AnchoredPanelRect } from '@/lib/useAnchoredPanel';
import type { RecruitmentDepartmentSlug } from '@/lib/recruitment/types';

type FilterValue = RecruitmentDepartmentSlug | 'all';

type Props = {
	value: FilterValue;
	onChange: (v: FilterValue) => void;
};

const MENU_GAP = 6;
const VIEWPORT_PAD = 12;

function measureMenuRect(trigger: HTMLElement): AnchoredPanelRect {
	const r = trigger.getBoundingClientRect();
	const top = r.bottom + MENU_GAP;
	return {
		top,
		bottom: 'auto',
		left: r.left,
		width: r.width,
		maxHeight: Math.max(120, window.innerHeight - top - VIEWPORT_PAD),
		placement: 'down',
	};
}

export function DepartmentSelect({ value, onChange }: Props) {
	const { open, rect, rootRef, triggerRef, setPanelEl, openPanel, requestClose } = useAnchoredPanel({
		leaveClass: 'nc-dept-dd-menu--leave',
		measure: measureMenuRect,
	});
	const listId = useId();

	const options: { value: FilterValue; label: string }[] = [
		{ value: 'all', label: '全部' },
		...DEPARTMENT_ORDER.map((d) => ({
			value: d,
			label: DEPARTMENT_LABELS[d],
		})),
	];

	const currentLabel = options.find((o) => o.value === value)?.label ?? options[0]!.label;

	let dropdownPortal: ReactNode = null;
	if (rect && typeof document !== 'undefined') {
		dropdownPortal = createPortal(
			<ul
				ref={setPanelEl}
				id={listId}
				className="nc-dept-dd-menu nc-dept-dd-menu--fixed"
				role="listbox"
				aria-labelledby={`${listId}-label`}
				style={{
					position: 'fixed',
					top: rect.top,
					left: rect.left,
					width: rect.width,
					maxWidth: rect.width,
					boxSizing: 'border-box',
					maxHeight: Math.min(rect.maxHeight, window.innerHeight * 0.6, 380),
				}}
			>
				{options.map((o) => (
					<li key={String(o.value)} role="presentation">
						<button
							type="button"
							role="option"
							aria-selected={value === o.value}
							className={`nc-dept-dd-option ${value === o.value ? 'is-active' : ''}`}
							onClick={() => {
								onChange(o.value);
								requestClose();
							}}
						>
							{o.label}
						</button>
					</li>
				))}
			</ul>,
			document.body
		) as ReactNode;
	}

	return (
		<div className="nc-dept-dd nc-coolfield" ref={rootRef}>
			<span className="nc-coolfield-label" id={`${listId}-label`}>
				组别
			</span>
			<button
				ref={triggerRef}
				type="button"
				className={`nc-dept-dd-trigger nc-coolfield-control ${open ? 'is-open' : ''}`}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-labelledby={`${listId}-label`}
				aria-controls={listId}
				onClick={() => {
					if (open) requestClose();
					else openPanel();
				}}
			>
				<span className="nc-dept-dd-trigger-text">{currentLabel}</span>
				<span className="nc-dept-dd-chevron" aria-hidden />
			</button>
			{dropdownPortal}
		</div>
	);
}
