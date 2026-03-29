import { useState } from 'react';

const CJK_TAG = /^[\u4e00-\u9fff]{1,2}$/;

type Props = {
	tags: string[];
	busy: boolean;
	error: string | null;
	me: { id: string } | null;
	onAdd: (tag: string) => Promise<void>;
	onRemove: (tag: string) => Promise<void>;
};

export function TagsSection({ tags, busy, error, me, onAdd, onRemove }: Props) {
	const [input, setInput] = useState('');

	const add = async () => {
		const t = input.trim();
		if (!CJK_TAG.test(t)) return;
		await onAdd(t);
		setInput('');
	};

	return (
		<section className="nc-detail-section">
			<h3 className="nc-section-title">标签</h3>
			{error ? <div className="nc-inline-err">{error}</div> : null}
			<ul className="nc-tags">
				{tags.map((t) => (
					<li key={t} className="nc-tag nc-tag--row">
						<span>{t}</span>
						<button type="button" className="nc-tag-remove" title="移除" disabled={busy || !me} onClick={() => void onRemove(t)}>
							×
						</button>
					</li>
				))}
			</ul>
			{me ? (
				<div className="nc-tag-add">
					<input
						className="nc-tag-input"
						maxLength={2}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						disabled={busy}
						aria-label="新标签"
					/>
					<button type="button" className="nc-btn nc-btn--secondary" disabled={busy || !CJK_TAG.test(input.trim())} onClick={() => void add()}>
						添加
					</button>
				</div>
			) : null}
		</section>
	);
}
