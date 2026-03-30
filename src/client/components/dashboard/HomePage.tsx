import { useEffect, useState } from 'react';
import { MarkdownBlock } from './newcomers/MarkdownBlock';
import { assetUrl } from '../../lib/assetUrl';
import circlePlus from '../../assets/img/icon/circle-plus.png';
import {
	createAnnouncement,
	deleteAnnouncement,
	fetchAnnouncements,
	fetchBiliDynamics,
	fetchMeRole,
	setAnnouncementPinned,
	type Announcement,
	type BiliDynamic,
	type MeRole,
} from '../../lib/home/homeClient';

function formatTime(isoOrTs: string | number | null | undefined): string {
	if (isoOrTs == null) return '未知时间';
	const d = typeof isoOrTs === 'number' ? new Date(isoOrTs * 1000) : new Date(isoOrTs);
	if (Number.isNaN(d.getTime())) return String(isoOrTs);
	return d.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function HomePage() {
	const [role, setRole] = useState<MeRole | null>(null);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [dynamics, setDynamics] = useState<BiliDynamic[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [title, setTitle] = useState('');
	const [contentMarkdown, setContentMarkdown] = useState('');
	const [publishOpen, setPublishOpen] = useState(false);

	const canPublish = role === 'admin' || role === 'super_admin';

	const loadHomeData = async () => {
		const [r, anns, dyns] = await Promise.all([fetchMeRole(), fetchAnnouncements(3), fetchBiliDynamics()]);
		setRole(r);
		setAnnouncements(anns);
		setDynamics(dyns);
	};

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const [r, anns, dyns] = await Promise.all([fetchMeRole(), fetchAnnouncements(3), fetchBiliDynamics()]);
				if (cancelled) return;
				setRole(r);
				setAnnouncements(anns);
				setDynamics(dyns);
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : '加载主页失败');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const onCreateAnnouncement = async () => {
		if (!title.trim() || !contentMarkdown.trim()) return;
		setBusy(true);
		setError(null);
		try {
			await createAnnouncement({
				title: title.trim(),
				contentMarkdown: contentMarkdown.trim(),
				isPinned: false,
			});
			await loadHomeData();
			setTitle('');
			setContentMarkdown('');
			setPublishOpen(false);
		} catch (e) {
			setError(e instanceof Error ? e.message : '发布公告失败');
		} finally {
			setBusy(false);
		}
	};

	const onDeleteAnnouncement = async (id: string) => {
		setBusy(true);
		setError(null);
		try {
			await deleteAnnouncement(id);
			await loadHomeData();
		} catch (e) {
			setError(e instanceof Error ? e.message : '删除公告失败');
		} finally {
			setBusy(false);
		}
	};

	const onTogglePin = async (item: Announcement) => {
		setBusy(true);
		setError(null);
		try {
			await setAnnouncementPinned(item.id, !item.isPinned);
			await loadHomeData();
		} catch (e) {
			setError(e instanceof Error ? e.message : '置顶操作失败');
		} finally {
			setBusy(false);
		}
	};

	if (loading) {
		return <div className="home-empty">加载中…</div>;
	}

	if (error && announcements.length === 0 && dynamics.length === 0) {
		return <div className="home-empty">{error}</div>;
	}

	return (
		<div className="home-grid">
			<section className="home-card">
				<div className="home-card-head">
					<h2>公告栏</h2>
					{canPublish ? (
						<button
							type="button"
							className="home-plus-btn"
							disabled={busy}
							aria-label="发布公告"
							title="发布公告"
							onClick={() => setPublishOpen((v) => !v)}
						>
							<img src={assetUrl(circlePlus)} alt="" />
						</button>
					) : null}
				</div>

				{canPublish && publishOpen ? (
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
							<button className="home-btn" type="button" disabled={busy} onClick={() => void onCreateAnnouncement()}>
								发布公告
							</button>
							<button className="home-btn home-btn-subtle" type="button" disabled={busy} onClick={() => setPublishOpen(false)}>
								取消
							</button>
						</div>
					</div>
				) : null}

				{error ? <div className="home-inline-err">{error}</div> : null}

				<div className="home-list">
					{announcements.length === 0 ? (
						<div className="home-muted">暂无公告</div>
					) : (
						announcements.map((a) => (
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
											<button
												type="button"
												className="home-btn home-btn-danger"
												disabled={busy}
												onClick={() => void onDeleteAnnouncement(a.id)}
											>
												移除
											</button>
										</div>
									) : null}
								</div>
								<div className="home-ann-meta">
									{a.createdByUsername} · {formatTime(a.createdAt)}
								</div>
								<MarkdownBlock>{a.contentMarkdown}</MarkdownBlock>
							</article>
						))
					)}
				</div>
			</section>

			<section className="home-card">
				<div className="home-card-head">
					<h2>B站动态</h2>
				</div>
				<div className="home-list">
					{dynamics.length === 0 ? (
						<div className="home-muted">暂无动态</div>
					) : (
						dynamics.slice(0, 1).map((d) => (
							<article key={d.id} className="home-dyn-item home-dyn-item--hero">
								<div className="home-dyn-meta">{d.pubTimeText ?? formatTime(d.pubTs)}</div>
								<h3 className="home-dyn-title">
									{d.jumpUrl ? (
										<a className="home-dyn-title-link" href={d.jumpUrl} target="_blank" rel="noreferrer">
											{d.title}
										</a>
									) : (
										d.title
									)}
								</h3>
								<p className="home-dyn-text">{d.text}</p>
								{d.mediaType === 'image' && d.mediaUrl ? (
									<img className="home-dyn-cover" src={d.mediaUrl} alt={d.title} loading="lazy" />
								) : null}
								{d.mediaType === 'video' && d.videoEmbedUrl ? (
									<iframe
										className="home-dyn-video"
										src={d.videoEmbedUrl}
										title={d.title}
										allowFullScreen
										loading="lazy"
									/>
								) : null}
							</article>
						))
					)}
				</div>
			</section>
		</div>
	);
}