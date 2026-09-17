import { useEffect, useRef } from 'react';

/**
 * Runs `poll` on an interval and again whenever the tab becomes visible after being hidden.
 * The callback is kept in a ref so callers do not have to memoize it.
 */
export function usePolling(poll: () => void | Promise<void>, intervalMs: number, deps: unknown[] = []) {
	const latest = useRef(poll);
	latest.current = poll;

	useEffect(() => {
		let disposed = false;
		const tick = () => {
			if (disposed) return;
			void latest.current();
		};

		const timer = window.setInterval(tick, intervalMs);
		const onVisible = () => {
			if (document.visibilityState === 'visible') tick();
		};
		document.addEventListener('visibilitychange', onVisible);

		return () => {
			disposed = true;
			window.clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [intervalMs, ...deps]);
}
