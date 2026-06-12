import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from '../../../lib/recruitment/departmentLabels';
import type { RecruitmentDepartmentSlug } from '../../../types/recruitmentUi';

const useIsoLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

type FilterValue = RecruitmentDepartmentSlug | 'all';

type MenuRect = { top: number; left: number; width: number; maxHeight: number };

type Props = {
	value: FilterValue;
	onChange: (v: FilterValue) => void;
};

const MENU_GAP = 6;
const VIEWPORT_PAD = 12;

function measureMenuRect(trigger: HTMLElement): MenuRect {
	const r = trigger.getBoundingClientRect();
	const top = r.bottom + MENU_GAP;
	const maxHeight = Math.max(120, window.innerHeight - top - VIEWPORT_PAD);
	return { top, left: r.left, width: r.width, maxHeight };
}

function prefersReducedMotion(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function DepartmentSelect({ value, onChange }: Props) {
	const [expanded, setExpanded] = useState(false);
	const [menuRect, setMenuRect] = useState<MenuRect | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLUListElement>(null);
	const listId = useId();

	const options: { value: FilterValue; label: string }[] = [
		{ value: 'all', label: '全部' },
		...DEPARTMENT_ORDER.map((d) => ({
			value: d,
			label: DEPARTMENT_LABELS[d],
		})),
	];

	const currentLabel = options.find((o) => o.value === value)?.label ?? options[0]!.label;

	const requestClose = useCallback(() => {
		setExpanded(false);
		if (prefersReducedMotion()) {
			setMenuRect(null);
			return;
		}
		const el = menuRef.current;
		if (!el) {
			setMenuRect(null);
			return;
		}
		if (el.classList.contains('nc-dept-dd-menu--leave')) return;
		el.classList.add('nc-dept-dd-menu--leave');
		const onEnd = (e: AnimationEvent) => {
			if (e.target !== el) return;
			el.classList.remove('nc-dept-dd-menu--leave');
			setMenuRect(null);
		};
		el.addEventListener('animationend', onEnd, { once: true });
	}, []);

	useIsoLayoutEffect(() => {
		if (!expanded) return;
		const trigger = triggerRef.current;
		if (!trigger) return;
		menuRef.current?.classList.remove('nc-dept-dd-menu--leave');
		const sync = () => setMenuRect(measureMenuRect(trigger));
		sync();
		window.addEventListener('resize', sync);
		window.addEventListener('scroll', sync, true);
		return () => {
			window.removeEventListener('resize', sync);
			window.removeEventListener('scroll', sync, true);
		};
	}, [expanded]);

	useEffect(() => {
		if (menuRect === null) return;
		const onDoc = (e: MouseEvent) => {
			const t = e.target as Node;
			if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
			requestClose();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') requestClose();
		};
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [menuRect, requestClose]);

	let dropdownPortal: ReactNode = null;
	if (menuRect && typeof document !== 'undefined') {
		dropdownPortal = createPortal(
			<ul
				ref={menuRef}
				id={listId}
				className="nc-dept-dd-menu nc-dept-dd-menu--fixed"
				role="listbox"
				aria-labelledby={`${listId}-label`}
				style={{
					position: 'fixed',
					top: menuRect.top,
					left: menuRect.left,
					width: menuRect.width,
					maxWidth: menuRect.width,
					boxSizing: 'border-box',
					maxHeight: Math.min(menuRect.maxHeight, window.innerHeight * 0.6, 380),
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
		<div className="nc-dept-dd" ref={rootRef}>
			<span className="nc-dept-dd-label" id={`${listId}-label`}>
				组别
			</span>
			<button
				ref={triggerRef}
				type="button"
				className={`nc-dept-dd-trigger ${expanded ? 'is-open' : ''}`}
				aria-haspopup="listbox"
				aria-expanded={expanded}
				aria-labelledby={`${listId}-label`}
				aria-controls={listId}
				onClick={() => {
					if (expanded) requestClose();
					else setExpanded(true);
				}}
			>
				<span className="nc-dept-dd-trigger-text">{currentLabel}</span>
				<span className="nc-dept-dd-chevron" aria-hidden />
			</button>
			{dropdownPortal}
		</div>
	);
}
