import { useLayoutEffect, useRef, useState } from 'react';

import { MarkdownBlock } from './MarkdownBlock';

import type { MeBrief, RecruitmentCommentDto } from '../../../lib/recruitment/recruitmentClient';
import { canShowDeleteRecruitmentComment } from '../../../lib/recruitment/recruitmentClient';
import { formatCstMonthDayTime } from '../../../lib/timeCst';

type Props = {
	me: MeBrief | null;
	comments: RecruitmentCommentDto[];
	busy: boolean;
	error: string | null;
	onAdd: (bodyMarkdown: string) => Promise<void>;
	onEdit: (commentId: string, bodyMarkdown: string) => Promise<void>;
	onDelete: (commentId: string) => Promise<void>;
	onLike: (commentId: string) => Promise<void>;
};

const COMMENT_GAP_PX = 12;

export function CommentsPanel({ me, comments, busy, error, onAdd, onEdit, onDelete, onLike }: Props) {
	const [draft, setDraft] = useState('');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editDraft, setEditDraft] = useState('');
	const listRef = useRef<HTMLDivElement>(null);
	const [listMaxHeightPx, setListMaxHeightPx] = useState<number | null>(null);

	useLayoutEffect(() => {
		const list = listRef.current;
		if (!list) return;

		const measure = () => {
			if (comments.length <= 3) {
				setListMaxHeightPx(null);
				return;
			}
			const cards = list.querySelectorAll('.nc-comment-card');
			if (cards.length < 3) {
				setListMaxHeightPx(null);
				return;
			}
			let h = 0;
			for (let i = 0; i < 3; i++) {
				h += (cards[i] as HTMLElement).offsetHeight;
			}
			h += COMMENT_GAP_PX * 2;
			setListMaxHeightPx(h);
		};

		measure();
		const ro = new ResizeObserver(() => measure());
		ro.observe(list);
		return () => ro.disconnect();
	}, [comments, editingId]);

	const submit = async () => {
		const t = draft.trim();
		if (!t || !me) return;
		await onAdd(t);
		setDraft('');
	};

	return (
		<div className="nc-comments">
			<div className="nc-comments-head">
				<h2 className="nc-comments-title">评论</h2>
				<span className="nc-comments-count">{comments.length}</span>
			</div>
			{error ? <div className="nc-inline-err">{error}</div> : null}
			<div ref={listRef} className="nc-comments-list" style={listMaxHeightPx != null ? { maxHeight: listMaxHeightPx } : undefined}>
				{comments.map((c) => (
					<div key={c.id} className="nc-comment-card">
						<div className="nc-comment-top">
							<span className="nc-comment-author">{c.authorUsername}</span>
							<span className={`nc-comment-role ${c.authorRole}`}>
								{c.authorRole === 'super_admin' ? '超管' : c.authorRole === 'admin' ? '管理员' : '成员'}
							</span>
							<time className="nc-comment-time" dateTime={c.createdAt}>
								{formatShort(c.createdAt)}
							</time>
						</div>
						{editingId === c.id ? (
							<div className="nc-comment-edit">
								<textarea className="nc-comment-textarea" value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={4} />
								<div className="nc-comment-edit-actions">
									<button
										type="button"
										className="nc-btn nc-btn--ghost"
										onClick={() => {
											setEditingId(null);
											setEditDraft('');
										}}
									>
										取消
									</button>
									<button
										type="button"
										className="nc-btn nc-btn--primary"
										disabled={busy || !editDraft.trim()}
										onClick={async () => {
											await onEdit(c.id, editDraft.trim());
											setEditingId(null);
											setEditDraft('');
										}}
									>
										保存
									</button>
								</div>
							</div>
						) : (
							<div className="nc-comment-body">
								<MarkdownBlock>{c.bodyMarkdown}</MarkdownBlock>
							</div>
						)}
						<div className="nc-comment-actions">
							<button
								type="button"
								className={`nc-like ${c.likedByMe ? 'is-on' : ''}`}
								disabled={busy || !me}
								onClick={() => void onLike(c.id)}
								title="点赞"
							>
								赞 {c.likeCount}
							</button>
							{me && me.id === c.authorId && editingId !== c.id ? (
								<button
									type="button"
									className="nc-btn nc-btn--text"
									onClick={() => {
										setEditingId(c.id);
										setEditDraft(c.bodyMarkdown);
									}}
								>
									编辑
								</button>
							) : null}
							{canShowDeleteRecruitmentComment(me, c) && editingId !== c.id ? (
								<button type="button" className="nc-btn nc-btn--text nc-btn--danger" onClick={() => void onDelete(c.id)}>
									删除
								</button>
							) : null}
						</div>
					</div>
				))}
			</div>
			<div className="nc-comments-compose">
				<textarea
					id="nc-comment-draft"
					className="nc-comment-textarea"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					rows={4}
					disabled={!me || busy}
					aria-label="评论"
				/>
				<button type="button" className="nc-btn nc-btn--primary nc-btn--block" disabled={!me || busy || !draft.trim()} onClick={() => void submit()}>
					发送
				</button>
			</div>
		</div>
	);
}

function formatShort(iso: string): string {
	try {
		return formatCstMonthDayTime(iso);
	} catch {
		return iso;
	}
}
