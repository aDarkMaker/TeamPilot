import { useCallback, useEffect, useRef, useState } from 'react';

import { useIsoLayoutEffect } from './useIsoLayoutEffect';
import { prefersReducedMotion } from './useReducedMotion';

export type AnchoredPanelRect = {
	top: number | 'auto';
	bottom: number | 'auto';
	left: number;
	width: number;
	maxHeight: number;
	placement: 'up' | 'down';
};

type Args = {
	/** Class toggled on the panel while the leave animation runs */
	leaveClass: string;
	/** Measures the panel against its trigger */
	measure: (trigger: HTMLElement) => AnchoredPanelRect;
};

/**
 * Anchored, portal-rendered dropdown behaviour shared by the custom selects:
 * keeps the panel aligned on resize/scroll, closes on outside click or Escape,
 * and waits for the leave animation before unmounting (unless motion is reduced).
 *
 * The trigger element type is a parameter so callers can anchor to a div as well as a button.
 */
export function useAnchoredPanel<T extends HTMLElement = HTMLButtonElement>({ leaveClass, measure }: Args) {
	const [open, setOpen] = useState(false);
	const [rect, setRect] = useState<AnchoredPanelRect | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<T>(null);
	const panelRef = useRef<HTMLElement | null>(null);
	const closeTokenRef = useRef(0);

	/** Pass to the portal-rendered panel so the hook can drive its leave animation */
	const setPanelEl = useCallback((el: HTMLElement | null) => {
		panelRef.current = el;
	}, []);

	const requestClose = useCallback(() => {
		setOpen(false);
		const token = (closeTokenRef.current += 1);
		const el = panelRef.current;
		if (!el || prefersReducedMotion()) {
			el?.classList.remove(leaveClass);
			setRect(null);
			return;
		}
		if (el.classList.contains(leaveClass)) return;
		el.classList.add(leaveClass);
		const onEnd = (e: AnimationEvent) => {
			if (e.target !== el) return;
			el.removeEventListener('animationend', onEnd);
			el.removeEventListener('animationcancel', onEnd);
			if (closeTokenRef.current !== token) return;
			el.classList.remove(leaveClass);
			setRect(null);
		};
		el.addEventListener('animationend', onEnd);
		el.addEventListener('animationcancel', onEnd);
	}, [leaveClass]);

	const openPanel = useCallback(() => {
		closeTokenRef.current += 1;
		panelRef.current?.classList.remove(leaveClass);
		setOpen(true);
	}, [leaveClass]);

	const toggle = useCallback(() => {
		if (open) requestClose();
		else openPanel();
	}, [open, requestClose, openPanel]);

	useIsoLayoutEffect(() => {
		if (!open) return;
		const trigger = triggerRef.current;
		if (!trigger) return;
		const sync = () => setRect(measure(trigger));
		sync();
		window.addEventListener('resize', sync);
		window.addEventListener('scroll', sync, true);
		return () => {
			window.removeEventListener('resize', sync);
			window.removeEventListener('scroll', sync, true);
		};
	}, [open, measure]);

	useEffect(() => {
		if (!open) return;
		const onDocMouseDown = (e: MouseEvent) => {
			const t = e.target as Node;
			if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
			requestClose();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') requestClose();
		};
		document.addEventListener('mousedown', onDocMouseDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocMouseDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, requestClose]);

	return { open, rect, rootRef, triggerRef, setPanelEl, toggle, openPanel, requestClose };
}
