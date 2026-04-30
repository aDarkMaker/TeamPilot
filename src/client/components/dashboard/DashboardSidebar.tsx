import { useEffect, useState, useRef, useCallback } from 'react';
import UserAvatar from './UserAvatar';
import { assetUrl } from '../../lib/assetUrl';

import iconLogo from '../../assets/img/icon/icon-hxk.png';
import iconDashboard from '../../assets/img/icon/navbar/dashboard.png';
import iconList from '../../assets/img/icon/navbar/list.png';
import iconUser from '../../assets/img/icon/navbar/user.png';
import iconCalendar from '../../assets/img/icon/navbar/calendar.png';
import iconUserPlus from '../../assets/img/icon/navbar/user-plus.png';
import iconLogout from '../../assets/img/icon/navbar/logout.png';
import iconSettings from '../../assets/img/icon/navbar/settings.png';

type MeResponse = {
	id: string;
	username: string;
	nickname: string | null;
	signature: string | null;
	qq: string | null;
	avatarUrl: string | null;
	profileBackgroundUrl: string | null;
	role: string;
	createdAt: string;
	updatedAt: string;
};

type MeApiJson = { ok?: boolean; data?: MeResponse };

type Props = {
    initialPath: string;
};

const roleLabel: Record<string, string> = {
    user: '用户',
    admin: '管理员',
    super_admin: '超级管理员',
};

function isStaff(role: string | undefined) {
    return role === 'admin' || role === 'super_admin';
}

function stripTrailingSlash(path: string): string {
	return path.replace(/\/+$/, '') || '/';
}

export default function DashboardSidebar({ initialPath }: Props) {
    const [me, setMe] = useState<MeResponse | null>(null);
    const [pathname, setPathname] = useState(() => stripTrailingSlash(initialPath));
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sidebarRef = useRef<HTMLElement>(null);

    const closeSidebar = useCallback(() => {
        setSidebarOpen(false);
    }, []);

    const toggleSidebar = useCallback(() => {
        setSidebarOpen((prev) => !prev);
    }, []);

    useEffect(() => {
        const handler = () => toggleSidebar();
        document.addEventListener('hxk:sidebar-toggle', handler);
        return () => document.removeEventListener('hxk:sidebar-toggle', handler);
    }, [toggleSidebar]);

    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth > 768) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const syncPath = () => setPathname(stripTrailingSlash(window.location.pathname));

        const load = async () => {
            try {
                const res = await fetch('/api/users/me', { credentials: 'include' });
                const json = (await res.json()) as MeApiJson;
                if (cancelled) return;
				if (res.ok && json?.ok && json.data) setMe(json.data);
				else if (res.status === 401) setMe(null);
            } catch {
				// ignore
            }
        };

        const onPage = () => {
            syncPath();
            void load();
        };

        syncPath();
        void load();
        document.addEventListener('astro:page-load', onPage);
        return () => {
            cancelled = true;
            document.removeEventListener('astro:page-load', onPage);
        };
    }, []);

	useEffect(() => {
		const onUpdated = (e: Event) => {
			const detail = (e as CustomEvent<Partial<MeResponse>>).detail;
			if (!detail) return;
			setMe((prev) => (prev ? { ...prev, ...detail } : prev));
		};

		window.addEventListener('hxk:profile-updated', onUpdated);
		return () => window.removeEventListener('hxk:profile-updated', onUpdated);
	}, []);

    const linkClass = (href: string) => {
        const h = stripTrailingSlash(href);
        return pathname === h || (h !== '/dashboard' && pathname.startsWith(h)) ? 'active' : '';
    };
    
    const onLogout = async () => {
		localStorage.removeItem('hxk_profile_background_url');

		document.documentElement.style.removeProperty('--dash-bg-image');

        try {
			await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
		} finally {
			window.location.href = '/auth';
		}
    };

    const displayName = me?.nickname?.trim() || me?.username || '…';
    const role = me?.role ?? 'user';

    return (
        <>
            <aside ref={sidebarRef} className={`dashboard-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
			<a className="dashboard-logo" href="/dashboard" onClick={(e) => { if (sidebarOpen) { e.preventDefault(); closeSidebar(); } }}>
				<img src={assetUrl(iconLogo)} alt="" width={40} height={40} />
				<span>小科·OFFICIAL</span>
			</a>
			<ul className="dashboard-nav">
				<li>
					<a className={linkClass('/dashboard')} href="/dashboard" onClick={closeSidebar}>
						<img src={assetUrl(iconDashboard)} alt="" />
						<span>工作主页</span>
					</a>
				</li>
				<li>
					<a className={linkClass('/dashboard/list')} href="/dashboard/list" onClick={closeSidebar}>
						<img src={assetUrl(iconList)} alt="" />
						<span>任务列表</span>
					</a>
				</li>
				{isStaff(me?.role) && (
					<li>
						<a className={linkClass('/dashboard/users')} href="/dashboard/users" onClick={closeSidebar}>
							<img src={assetUrl(iconUser)} alt="" />
							<span>成员管理</span>
						</a>
					</li>
				)}
				<li>
					<a className={linkClass('/dashboard/calendar')} href="/dashboard/calendar" onClick={closeSidebar}>
						<img src={assetUrl(iconCalendar)} alt="" />
						<span>日程安排</span>
					</a>
				</li>
				<li>
					<a className={linkClass('/dashboard/newcomers')} href="/dashboard/newcomers" onClick={closeSidebar}>
						<img src={assetUrl(iconUserPlus)} alt="" />
						<span>新人详情</span>
					</a>
				</li>
				<li>
					<a className={linkClass('/dashboard/settings')} href="/dashboard/settings" onClick={closeSidebar}>
						<img src={assetUrl(iconSettings)} alt="" />
						<span>个性设置</span>
					</a>
				</li>
			</ul>
			<div className="dashboard-user-card">
				{me ? (
					<UserAvatar username={me.username} avatarUrl={me.avatarUrl ?? null} />
				) : (
					<div className="avatar-letter">…</div>
				)}
				<div className="meta">
					<div className="name">{displayName}</div>
					<div className="role">{roleLabel[role] ?? role}</div>
				</div>
				<button type="button" className="dashboard-logout" onClick={onLogout} title="登出">
					<img src={assetUrl(iconLogout)} alt="登出" />
				</button>
			</div>
		</aside>
            <div className={`dashboard-sidebar-overlay ${sidebarOpen ? 'is-visible' : ''}`} onClick={closeSidebar} />
        </>
	);
}