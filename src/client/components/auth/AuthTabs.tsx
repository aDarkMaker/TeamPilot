import { useEffect, useRef, useState } from 'react';
import LoginCard from './LoginCard';
import ApplyCard from './ApplyCard';
type ViewMode = 'login' | 'apply';

export default function AuthTabs() {
	const [view, setView] = useState<ViewMode>('login');
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [contentHeight, setContentHeight] = useState<number>(0);

	const loginRef = useRef<HTMLDivElement>(null);
	const applyRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const activeRef = view === 'login' ? loginRef.current : applyRef.current;
		if (!activeRef) return;
		const measure = () => setContentHeight(activeRef.offsetHeight);
		measure();
		// Re-measure on font swap and on user-resized textareas so the wrap
		// height never clips the active panel.
		const observer = new ResizeObserver(measure);
		observer.observe(activeRef);
		return () => observer.disconnect();
	}, [view]);

	function switchView(next: ViewMode) {
		setView(next);
		setError(null);
		setSuccess(null);
	}

	return (
		<section className="auth-shell">
			<aside className="auth-brand">
				<span className="tc-eyebrow auth-brand-eyebrow">HXK · TOOLBOX</span>
				<p className="auth-brand-title">
					华小科
					<br />
					OFFICIAL
				</p>
				<p className="auth-brand-note">
					a place only for staff
					<br />
					visit{' '}
					<a className="auth-brand-link" href="https://huaxiaoke.com" target="_blank" rel="noreferrer">
						huaxiaoke.com
					</a>{' '}
					for more about us
				</p>
			</aside>
			<section className="glass-card">
				<header className="auth-header">
					<span className="eyebrow">小科 · OFFICIAL</span>
					<h1>{view === 'login' ? '欢迎回来' : '申请账号'}</h1>
					<p>{view === 'login' ? '该活了～' : '老大发个号！'}</p>
				</header>
				<div className="tab-switch" data-view={view}>
					<span className="tab-indicator" />
					<button type="button" className={view === 'login' ? 'tab-btn active' : 'tab-btn'} onClick={() => switchView('login')}>
						登录
					</button>
					<button type="button" className={view === 'apply' ? 'tab-btn active' : 'tab-btn'} onClick={() => switchView('apply')}>
						申请
					</button>
				</div>
				{error && <div className="msg msg-error">{error}</div>}
				{success && <div className="msg msg-success">{success}</div>}
				<div className="card-content-wrap" style={{ height: contentHeight ? `${contentHeight}px` : undefined }}>
					<div ref={loginRef} className={`card-panel ${view === 'login' ? 'active' : ''}`} aria-hidden={view !== 'login'}>
						<LoginCard onError={setError} onSuccess={setSuccess} onLoggedIn={() => (window.location.href = '/dashboard')} />
					</div>
					<div ref={applyRef} className={`card-panel ${view === 'apply' ? 'active' : ''}`} aria-hidden={view !== 'apply'}>
						<ApplyCard onError={setError} onSuccess={setSuccess} />
					</div>
				</div>
			</section>
		</section>
	);
}
