import { useState, useEffect, useCallback, useRef } from 'react';
import { navigate } from 'astro:transitions/client';

import { assetUrl } from '../../lib/assetUrl';
import iconSearch from '../../assets/img/icon/navbar/search.webp';
import iconNotifyNew from '../../assets/img/icon/navbar/message/massage-new.webp';
import iconNotifyAbout from '../../assets/img/icon/navbar/message/massage-aboutyou.webp';
import iconNotifyNull from '../../assets/img/icon/navbar/message/massage-null.webp';
import SearchPanel from './SearchPanel';

type NotifyVariant = 'new' | 'mention' | 'read';

type Props = {
	title: string;
	notifyVariant?: NotifyVariant;
};

type SearchResultItem = {
	id: string;
	type: 'user' | 'task' | 'newcomer' | 'application' | 'schedule';
	title: string;
	subtitle: string;
	url: string;
	matchField: string;
	matchText: string;
};

const notifySrc: Record<NotifyVariant, string> = {
	new: assetUrl(iconNotifyNew),
	mention: assetUrl(iconNotifyAbout),
	read: assetUrl(iconNotifyNull),
};

export default function DashboardTopBar({ title, notifyVariant = 'read' }: Props) {
	const [q, setQ] = useState('');
	const [results, setResults] = useState<SearchResultItem[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [loading, setLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const searchWrapRef = useRef<HTMLDivElement | null>(null);
	const prevQRef = useRef('');

	const search = useCallback(async (query: string) => {
		if (abortRef.current) abortRef.current.abort();
		if (!query.trim()) {
			setResults([]);
			setIsOpen(false);
			setLoading(false);
			return;
		}
		const ctrl = new AbortController();
		abortRef.current = ctrl;
		setLoading(true);
		setIsOpen(true);
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
				credentials: 'include',
				signal: ctrl.signal,
			});
			const json = await res.json().catch(() => ({}));
			if (ctrl.signal.aborted) return;
			if (json?.ok && Array.isArray(json.data)) {
				setResults(json.data as SearchResultItem[]);
			} else {
				setResults([]);
			}
		} catch (e) {
			if (ctrl.signal.aborted) return;
			setResults([]);
		} finally {
			if (!ctrl.signal.aborted) {
				setLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		setSelectedIndex(0);
		debounceRef.current = setTimeout(() => {
			void search(q);
		}, 280);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [q, search]);

	useEffect(() => {
		setSelectedIndex((i) => (results.length === 0 ? 0 : Math.min(i, results.length - 1)));
	}, [results]);

	const dismissPanel = useCallback(() => {
		setIsOpen(false);
		setResults([]);
		setSelectedIndex(0);
	}, []);

	const navigateTo = useCallback(
		(url: string) => {
			dismissPanel();
			void navigate(url);
		},
		[dismissPanel]
	);

	const toggleSidebar = () => {
		document.dispatchEvent(new CustomEvent('hxk:sidebar-toggle'));
	};

	useEffect(() => {
		const prev = prevQRef.current;
		prevQRef.current = q;
		if (q.trim()) return;
		if (!prev.trim()) return;
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		if (!url.searchParams.has('highlight')) return;
		url.searchParams.delete('highlight');
		const next = `${url.pathname}${url.search}${url.hash}`;
		const cur = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		if (next === cur) return;
		window.history.replaceState(window.history.state, '', next);
		document.dispatchEvent(new CustomEvent('hxk:highlight-url-sync'));
	}, [q]);

	useEffect(() => {
		if (!isOpen) return;
		const onPointerDown = (e: MouseEvent | TouchEvent) => {
			const el = searchWrapRef.current;
			const t = e.target;
			if (!el || !(t instanceof Node) || el.contains(t)) return;
			dismissPanel();
		};
		document.addEventListener('mousedown', onPointerDown);
		document.addEventListener('touchstart', onPointerDown, { passive: true });
		return () => {
			document.removeEventListener('mousedown', onPointerDown);
			document.removeEventListener('touchstart', onPointerDown);
		};
	}, [isOpen, dismissPanel]);

	return (
		<header className="dashboard-topbar">
			<button type="button" className="sidebar-hamburger" onClick={toggleSidebar} aria-label="切换侧边栏" title="菜单">
				<span className="sidebar-hamburger-line" />
				<span className="sidebar-hamburger-line" />
				<span className="sidebar-hamburger-line" />
			</button>
			<h1>{title}</h1>
			<div id="dashboard-topbar-toast-slot" className="dashboard-topbar-toast-slot" aria-live="polite" />
			<div className="dashboard-topbar-tools">
				<div className="dashboard-search" ref={searchWrapRef}>
					<img src={assetUrl(iconSearch)} alt="" loading="lazy" decoding="async" width={20} height={20} />
					<input
						type="search"
						placeholder="搜索…"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						aria-label="搜索"
						aria-expanded={isOpen}
						aria-controls={isOpen ? 'dashboard-search-results' : undefined}
						aria-activedescendant={isOpen && results.length > 0 ? `dashboard-search-option-${selectedIndex}` : undefined}
						autoComplete="off"
					/>
					{isOpen && (
						<SearchPanel
							id="dashboard-search-results"
							query={q.trim()}
							results={results}
							loading={loading}
							selectedIndex={selectedIndex}
							onSelect={setSelectedIndex}
							onNavigate={navigateTo}
							onDismiss={dismissPanel}
						/>
					)}
				</div>
				<button type="button" className="dashboard-notify-btn" title="通知" aria-label="通知">
					<img src={notifySrc[notifyVariant]} alt="" loading="lazy" decoding="async" width={20} height={20} />
				</button>
			</div>
		</header>
	);
}
