import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

function readHighlight(): string | null {
	if (typeof window === 'undefined') return null;
	return new URLSearchParams(window.location.search).get('highlight');
}

export function useSearchHighlight() {
	const [highlight, setHighlight] = useState<string | null>(() => readHighlight());

	useEffect(() => {
		const sync = () => setHighlight(readHighlight());
		window.addEventListener('popstate', sync);
		document.addEventListener('astro:page-load', sync);
		document.addEventListener('hxk:highlight-url-sync', sync);
		return () => {
			window.removeEventListener('popstate', sync);
			document.removeEventListener('astro:page-load', sync);
			document.removeEventListener('hxk:highlight-url-sync', sync);
		};
	}, []);

	const highlightText = useCallback(
		(text: string | null | undefined): ReactNode => {
			if (!text) return text ?? null;
			if (!highlight) return text;
			const lower = text.toLowerCase();
			const lowerHl = highlight.toLowerCase();
			const idx = lower.indexOf(lowerHl);
			if (idx === -1) return text;
			const before = text.slice(0, idx);
			const match = text.slice(idx, idx + highlight.length);
			const after = text.slice(idx + highlight.length);
			return (
				<>
					{before}
					<mark className="search-highlight">{match}</mark>
					{after}
				</>
			);
		},
		[highlight]
	);

	return { highlight, highlightText };
}
