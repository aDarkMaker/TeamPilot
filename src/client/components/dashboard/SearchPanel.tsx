import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

type SearchResultItem = {
	id: string;
	type: 'user' | 'task' | 'newcomer' | 'application' | 'schedule';
	title: string;
	subtitle: string;
	url: string;
};

type Props = {
	id?: string;
	query: string;
	results: SearchResultItem[];
	loading: boolean;
	selectedIndex: number;
	onSelect: (index: number) => void;
	onNavigate: (url: string) => void;
	onDismiss: () => void;
};

const typeLabel: Record<SearchResultItem['type'], string> = {
	user: '成员',
	task: '任务',
	newcomer: '新人',
	application: '待审批',
	schedule: '日程',
};

const typeIcon: Record<SearchResultItem['type'], string> = {
	user: 'U',
	task: 'T',
	newcomer: 'N',
	application: 'A',
	schedule: 'S',
};

function highlightMatch(text: string, keyword: string): ReactNode {
	if (!keyword) return text;
	const lower = text.toLowerCase();
	const lowerKw = keyword.toLowerCase();
	const idx = lower.indexOf(lowerKw);
	if (idx === -1) return text;
	return (
		<>
			{text.slice(0, idx)}
			<mark className="sp-mark">{text.slice(idx, idx + keyword.length)}</mark>
			{text.slice(idx + keyword.length)}
		</>
	);
}

export default function SearchPanel({
	id,
	query,
	results,
	loading,
	selectedIndex,
	onSelect,
	onNavigate,
	onDismiss,
}: Props) {
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const activeEl = panelRef.current?.querySelector('.sp-item--active') as HTMLElement | null;
		activeEl?.scrollIntoView({ block: 'nearest' });
	}, [selectedIndex]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				onDismiss();
				return;
			}
			if (results.length === 0) return;
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				onSelect(Math.min(selectedIndex + 1, results.length - 1));
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				onSelect(Math.max(selectedIndex - 1, 0));
				return;
			}
			if (e.key === 'Enter') {
				e.preventDefault();
				const item = results[selectedIndex];
				if (item) onNavigate(item.url);
			}
		};
		window.addEventListener('keydown', handler, true);
		return () => window.removeEventListener('keydown', handler, true);
	}, [results, selectedIndex, onSelect, onNavigate, onDismiss]);

	if (!query && results.length === 0) return null;

	return (
		<div
			id={id}
			className="sp-panel"
			ref={panelRef}
			role="listbox"
			aria-label="搜索结果"
		>
				{loading && (
					<div className="sp-loading">
						<span className="sp-spinner" />
						搜索中…
					</div>
				)}

				{!loading && results.length === 0 && (
					<div className="sp-empty">没有找到 "{query}" 相关的结果</div>
				)}

				{results.map((item, i) => (
					<div
						key={item.id}
						id={`dashboard-search-option-${i}`}
						role="option"
						aria-selected={i === selectedIndex}
						className={`sp-item ${i === selectedIndex ? 'sp-item--active' : ''}`}
						onMouseEnter={() => onSelect(i)}
						onClick={() => onNavigate(item.url)}
					>
						<span className={`sp-type sp-type--${item.type}`}>{typeIcon[item.type]}</span>
						<div className="sp-body">
							<div className="sp-title">{highlightMatch(item.title, query)}</div>
							<div className="sp-subtitle">{item.subtitle}</div>
						</div>
						<span className="sp-tag">{typeLabel[item.type]}</span>
					</div>
				))}
		</div>
	);
}
