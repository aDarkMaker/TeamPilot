import { useEffect } from 'react';

export default function DashboardAuthGuard() {
	useEffect(() => {
		let cancelled = false;

		const check = async () => {
			try {
				const res = await fetch('/api/users/me', { credentials: 'include' });
				if (cancelled) return;
				if (res.status === 401) {
					window.location.replace('/auth');
				}
			} catch {
				// ignore network jitter in guard
			}
		};

		void check();
	}, []);

	return null;
}

