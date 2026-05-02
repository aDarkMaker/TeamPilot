import { useEffect, useState } from 'react';
import { MarkdownBlock } from './newcomers/MarkdownBlock';
import { DashboardToast, useDashboardToast } from './DashboardToast';
import { assetUrl } from '../../lib/assetUrl';
import circlePlus from '../../assets/img/icon/circle-plus.webp';
import { formatCstDateTime } from '../../lib/timeCst';
import {
	createAnnouncement,
	deleteAnnouncement,
	fetchAnnouncements,
	fetchBirthdayWishes,
	fetchBiliDynamics,
	fetchMeRole,
	fetchTodayBirthdays,
	postBirthdayWish,
	setAnnouncementPinned,
	type Announcement,
	type BirthdayWish,
	type BiliDynamic,
	type MeRole,
	type TodayBirthdayUser,
} from '../../lib/home/homeClient';

function formatTime(isoOrTs: string | number | null | undefined): string {
	if (isoOrTs == null) return '未知时间';
	if (typeof isoOrTs === 'number') {
		const d = new Date(isoOrTs * 1000);
		if (Number.isNaN(d.getTime())) return String(isoOrTs);
		return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'medium', timeStyle: 'short' }).format(d);
	}
	return formatCstDateTime(isoOrTs);
}

export default function HomePage() {
	const [role, setRole] = useState<MeRole | null>(null);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [dynamics, setDynamics] = useState<BiliDynamic[]>([]);
	const [birthdayUsers, setBirthdayUsers] = useState<TodayBirthdayUser[]>([]);
	const [wishMap, setWishMap] = useState<Record<string, BirthdayWish[]>>({});
	const [wishInputMap, setWishInputMap] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<{ text: string; seq: number } | null>(null);
	const toast = useDashboardToast();

	const [title, setTitle] = useState('');
	const [contentMarkdown, setContentMarkdown] = useState('');
	const [publishOpen, setPublishOpen] = useState(false);

	const canPublish = role === 'admin' || role === 'super_admin';

	const loadHomeData = async () => {
		const [r, anns, dyns, birthdays] = await Promise.all([
			fetchMeRole(),
			fetchAnnouncements(3),
			fetchBiliDynamics(),
			fetchTodayBirthdays(),
		]);
		setRole(r);
		setAnnouncements(anns);
		setDynamics(dyns);
		setBirthdayUsers(birthdays.users);
		if (birthdays.users.length > 0) {
			const wishEntries = await Promise.all(
				birthdays.users.map(async (u) => {
					const rows = await fetchBirthdayWishes(u.id);
					return [u.id, rows.items] as const;
				}),
			);
			setWishMap(Object.fromEntries(wishEntries));
		} else {
			setWishMap({});
		}
	};

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const [r, anns, dyns, birthdays] = await Promise.all([
					fetchMeRole(),
					fetchAnnouncements(3),
					fetchBiliDynamics(),
					fetchTodayBirthdays(),
				]);
				if (cancelled) return;
				setRole(r);
				setAnnouncements(anns);
				setDynamics(dyns);
				setBirthdayUsers(birthdays.users);
				if (birthdays.users.length > 0) {
					const wishEntries = await Promise.all(
						birthdays.users.map(async (u) => {
							const rows = await fetchBirthdayWishes(u.id);
							return [u.id, rows.items] as const;
						}),
					);
					setWishMap(Object.fromEntries(wishEntries));
				}
			} catch (e) {
				if (!cancelled) {
					const text = e instanceof Error ? e.message : '加载主页失败';
					setError({ text, seq: Date.now() });
				}
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
			const text = e instanceof Error ? e.message : '发布公告失败';
			setError({ text, seq: Date.now() });
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
			const text = e instanceof Error ? e.message : '删除公告失败';
			setError({ text, seq: Date.now() });
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
			const text = e instanceof Error ? e.message : '置顶操作失败';
			setError({ text, seq: Date.now() });
		} finally {
			setBusy(false);
		}
	};

	const onPostWish = async (recipientUserId: string) => {
		const message = (wishInputMap[recipientUserId] ?? '').trim();
		if (!message) return;
		setBusy(true);
		setError(null);
		try {
			const created = await postBirthdayWish({ recipientUserId, message });
			setWishMap((prev) => ({
				...prev,
				[recipientUserId]: [...(prev[recipientUserId] ?? []), created],
			}));
			setWishInputMap((prev) => ({ ...prev, [recipientUserId]: '' }));
		} catch (e) {
			const text = e instanceof Error ? e.message : '发送祝福失败';
			setError({ text, seq: Date.now() });
		} finally {
			setBusy(false);
		}
	};

	const fatalError = error && announcements.length === 0 && dynamics.length === 0 && birthdayUsers.length === 0;

	useEffect(() => {
		if (!error) return;
		if (fatalError) return;
		toast.show({ text: error.text, type: 'err', durationMs: 3000 });
		setError(null);
	}, [error?.seq, fatalError, toast]);

	if (loading) {
		return <div className="home-empty">加载中…</div>;
	}

	if (fatalError) {
		return <div className="home-empty">{error?.text}</div>;
	}

	return (
		<div className="home-page">
			<DashboardToast toast={toast.toast} />
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
							<img src={assetUrl(circlePlus)} alt="" loading="lazy" decoding="async" width={24} height={24} />
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

			<div className="home-right-col">
				{birthdayUsers.length > 0 ? (
					<section className="home-card">
						<div className="home-card-head">
							<h2>今日寿星</h2>
						</div>
						<div className="home-list">
							{birthdayUsers.map((u) => (
								<article key={u.id} className="home-birthday-item">
									<div className="home-birthday-user">
										<div className="home-birthday-avatar">
											{u.avatarUrl ? <img src={u.avatarUrl} alt="" loading="lazy" decoding="async" width={36} height={36} /> : <span>{(u.nickname ?? u.username).slice(0, 1)}</span>}
										</div>
										<div className="home-birthday-name">{u.nickname ?? u.username}</div>
									</div>
									<div className="home-birthday-wishes">
										{(wishMap[u.id] ?? []).length === 0 ? (
											<div className="home-muted">空空如也，速速送上祝福！</div>
										) : (
											(wishMap[u.id] ?? []).map((w) => (
												<div key={w.id} className="home-birthday-wish-line">
													<span className="home-birthday-wish-author">{w.author.nickname ?? w.author.username}:</span>
													<span>{w.message}</span>
												</div>
											))
										)}
									</div>
									<div className="home-birthday-send">
										<input
											className="home-input"
											placeholder={`给 ${u.nickname ?? u.username} 送上祝福`}
											value={wishInputMap[u.id] ?? ''}
											disabled={busy}
											onChange={(e) => setWishInputMap((prev) => ({ ...prev, [u.id]: e.target.value }))}
										/>
										<button className="home-btn" type="button" disabled={busy} onClick={() => void onPostWish(u.id)}>
											发送
										</button>
									</div>
								</article>
							))}
						</div>
					</section>
				) : null}

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
										<img className="home-dyn-cover" src={d.mediaUrl} alt={d.title} loading="lazy" decoding="async" />
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
			</div>
		</div>
	);
}