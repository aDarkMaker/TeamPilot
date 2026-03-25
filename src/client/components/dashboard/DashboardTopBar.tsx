import { useState } from 'react';

import { assetUrl } from '../../lib/assetUrl';
import iconSearch from '../../assets/img/icon/navbar/search.png';
import iconNotifyNew from '../../assets/img/icon/navbar/message/massage-new.png';
import iconNotifyAbout from '../../assets/img/icon/navbar/message/massage-aboutyou.png';
import iconNotifyNull from '../../assets/img/icon/navbar/message/massage-null.png';

type NotifyVariant = 'new' | 'mention' | 'read';

type Props = {
    title: string;
    // TODO: 通知 API
    notifyVariant?: NotifyVariant;
};

const notifySrc: Record<NotifyVariant, string> = {
	new: assetUrl(iconNotifyNew),
	mention: assetUrl(iconNotifyAbout),
	read: assetUrl(iconNotifyNull),
};

export default function DashboardTopBar({ title, notifyVariant = 'read' }: Props) {
    const [q, setQ] = useState('');

    return (
        <header className="dashboard-topbar">
            <h1>{title}</h1>
            <div className="dashboard-topbar-tools">
                <div className="dashboard-search">
                    <img src={assetUrl(iconSearch)} alt="" />
                    <input
                        type="search"
                        placeholder="搜索…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        aria-label="搜索"
                    />
                </div>
                <button type="button" className="dashboard-notify-btn" title="通知" aria-label="通知">
                    <img src={notifySrc[notifyVariant]} alt="" />
                </button>
            </div>
        </header>
    )
}
