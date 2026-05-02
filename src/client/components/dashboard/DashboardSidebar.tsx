import { useEffect, useState, useRef, useCallback } from 'react';
import UserAvatar from './UserAvatar';
import { assetUrl } from '../../lib/assetUrl';
import OptimizedImage from '../OptimizedImage';

import iconLogo from '../../assets/img/icon/icon-hxk.webp';
import iconDashboard from '../../assets/img/icon/navbar/dashboard.webp';
import iconList from '../../assets/img/icon/navbar/list.webp';
import iconUser from '../../assets/img/icon/navbar/user.webp';
import iconCalendar from '../../assets/img/icon/navbar/calendar.webp';
import iconUserPlus from '../../assets/img/icon/navbar/user-plus.webp';
import iconLogout from '../../assets/img/icon/navbar/logout.webp';
import iconSettings from '../../assets/img/icon/navbar/settings.webp';

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
				<OptimizedImage src={assetUrl(iconLogo)} alt="" width={40} height={40} critical />
				<span>小科·OFFICIAL</span>
			</a>
			<ul className="dashboard-nav">
				<li>
					<a className={linkClass('/dashboard')} href="/dashboard" onClick={closeSidebar}>
						<OptimizedImage src={assetUrl(iconDashboard)} alt="" width={24} height={24} />
						<span>工作主页</span>
					</a>
				</li>
				<li>
					<a className={linkClass('/dashboard/list')} href="/dashboard/list" onClick={closeSidebar}>
						<OptimizedImage src={assetUrl(iconList)} alt="" width={24} height={24} />
						<span>任务列表</span>
					</a>
				</li>
				{isStaff(me?.role) && (
					<li>
						<a className={linkClass('/dashboard/users')} href="/dashboard/users" onClick={closeSidebar}>
							<OptimizedImage src={assetUrl(iconUser)} alt="" width={24} height={24} />
							<span>成员管理</span>
						</a>
					</li>
				)}
				<li>
					<a className={linkClass('/dashboard/calendar')} href="/dashboard/calendar" onClick={closeSidebar}>
						<OptimizedImage src={assetUrl(iconCalendar)} alt="" width={24} height={24} />
						<span>日程安排</span>
					</a>
				</li>
				<li>
					<a className={linkClass('/dashboard/newcomers')} href="/dashboard/newcomers" onClick={closeSidebar}>
						<OptimizedImage src={assetUrl(iconUserPlus)} alt="" width={24} height={24} />
						<span>新人详情</span>
					</a>
				</li>
				<li>
					<a className={linkClass('/dashboard/settings')} href="/dashboard/settings" onClick={closeSidebar}>
						<OptimizedImage src={assetUrl(iconSettings)} alt="" width={24} height={24} />
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
					<OptimizedImage src={assetUrl(iconLogout)} alt="登出" width={24} height={24} />
				</button>
			</div>
		</aside>
            <div className={`dashboard-sidebar-overlay ${sidebarOpen ? 'is-visible' : ''}`} onClick={closeSidebar} />
        </>
	);
}