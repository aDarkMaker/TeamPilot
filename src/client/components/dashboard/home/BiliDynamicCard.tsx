import { useState } from 'react';

import { formatCstTimestamp } from '@/lib/timeCst';
import type { BiliDynamic } from '@/lib/home/homeClient';

type Props = {
	dynamics: BiliDynamic[];
};

/** Latest Bilibili dynamic, rendered as a hero card with an inline video player */
export function BiliDynamicCard({ dynamics }: Props) {
	const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
	const latest = dynamics.slice(0, 1);

	return (
		<section className="home-card">
			<div className="home-card-head">
				<h2>B站动态</h2>
			</div>
			<div className="home-list">
				{latest.length === 0 ? (
					<div className="home-muted">暂无动态</div>
				) : (
					latest.map((d) => (
						<article key={d.id} className="home-dyn-item home-dyn-item--hero">
							<div className="home-dyn-meta">{d.pubTimeText ?? formatCstTimestamp(d.pubTs)}</div>
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
								activeVideoId === d.id ? (
									<iframe className="home-dyn-video" src={d.videoEmbedUrl} title={d.title} allowFullScreen />
								) : (
									<button type="button" className="home-dyn-play-btn" onClick={() => setActiveVideoId(d.id)} aria-label="播放视频">
										{d.mediaUrl ? <img className="home-dyn-cover" src={d.mediaUrl} alt={d.title} loading="lazy" decoding="async" /> : null}
										<span className="home-dyn-play-icon">&#9654;</span>
									</button>
								)
							) : null}
						</article>
					))
				)}
			</div>
		</section>
	);
}
