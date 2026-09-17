import { formatCstTimestamp } from '@/lib/timeCst';
import { MarkdownBlock } from '@/components/common/MarkdownBlock';
import type { Announcement } from '@/lib/home/homeClient';

type Props = {
	announcements: Announcement[];
	canPublish: boolean;
	busy: boolean;
	onTogglePin: (item: Announcement) => Promise<boolean>;
	onDelete: (id: string) => Promise<boolean>;
};

export function AnnouncementList({ announcements, canPublish, busy, onTogglePin, onDelete }: Props) {
	if (announcements.length === 0) {
		return <div className="home-muted">暂无公告</div>;
	}

	return (
		<>
			{announcements.map((a) => (
				<article key={a.id} className="home-ann-item">
					<div className="home-ann-head">
						<h3>{a.title}</h3>
						{canPublish ? (
							<div className="home-ann-actions">
								<button
									type="button"
									className={`home-chip-btn ${a.isPinned ? 'is-active' : ''}`}
									disabled={busy}
									onClick={() => void onTogglePin(a)}
								>
									{a.isPinned ? '已置顶' : '置顶'}
								</button>
								<button type="button" className="home-btn home-btn-danger" disabled={busy} onClick={() => void onDelete(a.id)}>
									移除
								</button>
							</div>
						) : null}
					</div>
					<div className="home-ann-meta">
						{a.createdByUsername} · {formatCstTimestamp(a.createdAt)}
					</div>
					<MarkdownBlock>{a.contentMarkdown}</MarkdownBlock>
				</article>
			))}
		</>
	);
}
