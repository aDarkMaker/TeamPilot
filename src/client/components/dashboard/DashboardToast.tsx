import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type DashboardToastType = 'ok' | 'err' | 'info';

export type DashboardToastItem = {
	text: string;
	type: DashboardToastType;
	seq: number;
};

type RenderState = {
	text: string;
	type: DashboardToastType;
	leaving: boolean;
	seq: number;
} | null;

export function useDashboardToast() {
	const [toast, setToast] = useState<RenderState>(null);
	const timersRef = useRef<{ t1: number | null; t2: number | null }>({ t1: null, t2: null });

	const clearTimers = useCallback(() => {
		if (timersRef.current.t1 != null) window.clearTimeout(timersRef.current.t1);
		if (timersRef.current.t2 != null) window.clearTimeout(timersRef.current.t2);
		timersRef.current.t1 = null;
		timersRef.current.t2 = null;
	}, []);

	useEffect(() => {
		return () => clearTimers();
	}, [clearTimers]);

	const show = useCallback(
		(input: { text: string; type?: DashboardToastType; durationMs?: number }) => {
			const text = input.text.trim();
			if (!text) return;
			const type: DashboardToastType = input.type ?? 'info';
			const durationMs = input.durationMs ?? 3000;
			const seq = Date.now();

			clearTimers();
			setToast({ text, type, leaving: false, seq });

			timersRef.current.t1 = window.setTimeout(() => {
				setToast((p) => (p && p.seq === seq ? { ...p, leaving: true } : p));
			}, durationMs);

			timersRef.current.t2 = window.setTimeout(() => {
				setToast((p) => (p && p.seq === seq ? null : p));
			}, durationMs + 400);
		},
		[clearTimers],
	);

	const dismiss = useCallback(() => {
		clearTimers();
		setToast(null);
	}, [clearTimers]);

	const api = useMemo(() => ({ toast, show, dismiss }), [toast, show, dismiss]);
	return api;
}

export function DashboardToast({ toast }: { toast: RenderState }) {
	if (!toast) return null;
	const target = typeof document !== 'undefined' ? document.getElementById('dashboard-topbar-toast-slot') : null;
	const node = (
		<div className={`dash-toast dash-toast--${toast.type} ${toast.leaving ? 'is-leaving' : ''}`} role="status">
			{toast.text}
		</div>
	);
	return target ? createPortal(node, target) : node;
}

