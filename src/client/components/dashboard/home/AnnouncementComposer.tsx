import { useState } from 'react';

import circlePlus from '@/assets/img/icon/circle-plus.webp';
import { assetUrl } from '@/lib/assetUrl';

type Props = {
	busy: boolean;
	onCreate: (input: { title: string; contentMarkdown: string }) => Promise<boolean>;
};

/** Collapsible announcement composer shown to admins only */
export function AnnouncementComposer({ busy, onCreate }: Props) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState('');
	const [contentMarkdown, setContentMarkdown] = useState('');

	const submit = async () => {
		if (!title.trim() || !contentMarkdown.trim()) return;
		const ok = await onCreate({ title: title.trim(), contentMarkdown: contentMarkdown.trim() });
		if (!ok) return;
		setTitle('');
		setContentMarkdown('');
		setOpen(false);
	};

	return (
		<>
			<button
				type="button"
				className="home-plus-btn"
				disabled={busy}
				aria-label="发布公告"
				title="发布公告"
				onClick={() => setOpen((v) => !v)}
			>
				<img src={assetUrl(circlePlus)} alt="" loading="lazy" decoding="async" width={24} height={24} />
			</button>

			{open ? (
				<div className="home-publish">
					<input
						className="home-input"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="公告标题"
						maxLength={80}
						disabled={busy}
					/>
					<textarea
						className="home-textarea"
						value={contentMarkdown}
						onChange={(e) => setContentMarkdown(e.target.value)}
						placeholder="公告内容"
						rows={6}
						disabled={busy}
					/>
					<div className="home-publish-actions">
						<button className="home-btn" type="button" disabled={busy} onClick={() => void submit()}>
							发布公告
						</button>
						<button className="home-btn home-btn-subtle" type="button" disabled={busy} onClick={() => setOpen(false)}>
							取消
						</button>
					</div>
				</div>
			) : null}
		</>
	);
}
