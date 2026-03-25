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
		setContentHeight(activeRef.offsetHeight);
	}, [view]);

	function switchView(next: ViewMode) {
		setView(next);
		setError(null);
		setSuccess(null);
	}

	return (
		<section className="glass-card">
			<header className="auth-header">
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
					<LoginCard onError={setError} onSuccess={setSuccess} />
				</div>
				<div ref={applyRef} className={`card-panel ${view === 'apply' ? 'active' : ''}`} aria-hidden={view !== 'apply'}>
					<ApplyCard onError={setError} onSuccess={setSuccess} />
				</div>
			</div>
		</section>
	);
}
