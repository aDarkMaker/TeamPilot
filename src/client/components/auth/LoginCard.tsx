import { useState } from 'react';

type Props = {
	onError: (msg: string | null) => void;
	onSuccess: (msg: string | null) => void;
};

export default function LoginCard({ onError, onSuccess }: Props) {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		onError(null);
		onSuccess(null);

		if (!username.trim() || !password.trim()) {
			onError('WHO ARE YOU');
			return;
		}

		setLoading(true);
		try {
			const resp = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ username: username.trim(), password }),
			});

			const data = await resp.json().catch(() => null);

			if (!resp.ok || !data?.ok) {
				const message = data?.message || data?.code || 'LOGIN FAILED';
				throw new Error(message);
			}

			onSuccess('WELCOME BACK!');
		} catch (err) {
			onError(err instanceof Error ? err.message : 'LOGIN FAILED');
		} finally {
			setLoading(false);
		}
	}

	return (
		<form className="auth-form" onSubmit={onSubmit}>
			<div className="input-group">
				<label htmlFor="login-username">用户名</label>
				<input id="login-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入实名" autoComplete="username" />
			</div>

			<div className="input-group">
				<label htmlFor="login-password">密码</label>
				<input
					id="login-password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="请输入密码"
					autoComplete="current-password"
				/>
			</div>

			<button className="submit-btn" type="submit" disabled={loading}>
				{loading ? '登录中...' : '登录'}
			</button>
		</form>
	);
}
