import { useEffect } from 'react';

import { useHomeData } from '@/lib/home/useHomeData';
import { DashboardToast, useDashboardToast } from '@/components/dashboard/shell/DashboardToast';
import { AnnouncementComposer } from './AnnouncementComposer';
import { AnnouncementList } from './AnnouncementList';
import { BirthdaySection } from './BirthdaySection';
import { BiliDynamicCard } from './BiliDynamicCard';

export default function HomePage() {
	const home = useHomeData();
	const { toast: toastState, show: showToast } = useDashboardToast();
	const { error, fatalError, dismissError } = home;
	const errorSeq = error?.seq ?? 0;
	const errorText = error?.text ?? '';

	useEffect(() => {
		if (!errorSeq || fatalError) return;
		showToast({ text: errorText, type: 'err', durationMs: 3000 });
		dismissError();
	}, [errorSeq, errorText, fatalError, showToast, dismissError]);

	if (home.loading) {
		return <div className="tc-empty home-empty">加载中…</div>;
	}

	if (fatalError) {
		return <div className="tc-empty home-empty">{errorText}</div>;
	}

	return (
		<div className="tc-page home-page">
			<DashboardToast toast={toastState} />
			<div className="tc-page-head">
				<div className="tc-page-head__text">
					<span className="tc-eyebrow">公告板</span>
					<h1 className="tc-page-title">工作主页</h1>
				</div>
			</div>
			<div className="home-grid">
				<section className="home-card">
					<div className="home-card-head">
						<h2>公告栏</h2>
						{home.canPublish ? <AnnouncementComposer busy={home.busy} onCreate={home.createAnnouncement} /> : null}
					</div>

					<div className="home-list">
						<AnnouncementList
							announcements={home.announcements}
							canPublish={home.canPublish}
							busy={home.busy}
							onTogglePin={home.toggleAnnouncementPinned}
							onDelete={home.deleteAnnouncement}
						/>
					</div>
				</section>

				<div className="home-right-col">
					<BirthdaySection users={home.birthdayUsers} wishMap={home.wishMap} busy={home.busy} onSendWish={home.postWish} />
					<BiliDynamicCard dynamics={home.dynamics} />
				</div>
			</div>
		</div>
	);
}
