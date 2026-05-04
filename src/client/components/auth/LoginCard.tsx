import { useState } from 'react';

type Props = {
	onError: (msg: string | null) => void;
	onSuccess: (msg: string | null) => void;
	onLoggedIn?: () => void;
};

export default function LoginCard({ onError, onSuccess, onLoggedIn }: Props) {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		onError(null);
		onSuccess(null);

		if (!username.trim() || !password.trim()) {
			onError('你谁呀，用户名密码填一下～');
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
				const message = data?.message || data?.code || '登录失败了，再试试？';
				throw new Error(message);
			}

			if (data?.data?.passwordWasResetToDefault) {
				onSuccess(
					'当前密码不符合安全规范，已重置为默认密码 HXK135790，请尽快在设置中修改。',
				);
			} else {
				onSuccess('欢迎回来！');
			}
			onLoggedIn?.();
		} catch (err) {
			onError(err instanceof Error ? err.message : '登录失败了，再试试？');
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
