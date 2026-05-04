import { useState } from 'react';

import { broadcastApplicationsUpdated } from '../../lib/pendingApplicationsStore';
import { isPasswordPolicyCompliant, PASSWORD_POLICY_HINT } from '../../lib/passwordPolicy';

type Props = {
	onError: (msg: string | null) => void;
	onSuccess: (msg: string | null) => void;
};

export default function ApplyCard({ onError, onSuccess }: Props) {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [reason, setReason] = useState('');
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		onError(null);
		onSuccess(null);

		if (username.trim().length < 2 || username.trim().length > 4) {
			onError('你真叫这个吗');
			return;
		}
		if (password.length < 8) {
			onError('密码好短哦');
			return;
		}
		if (!isPasswordPolicyCompliant(password)) {
			onError(PASSWORD_POLICY_HINT);
			return;
		}
		if (reason.trim().length < 2) {
			onError('驳回');
			return;
		}

		setLoading(true);
		try {
			const resp = await fetch('/api/application', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, reason }),
			});

			const data = await resp.json().catch(() => null);

			if (!resp.ok || !data?.ok) {
				const message = data?.message || data?.error || '申请提交失败';
				throw new Error(message);
			}

			broadcastApplicationsUpdated();
			onSuccess('已上报组织');
			setUsername('');
			setPassword('');
			setReason('');
		} catch (err) {
			onError(err instanceof Error ? err.message : '申请提交失败');
		} finally {
			setLoading(false);
		}
	}

	return (
		<form className="auth-form" onSubmit={onSubmit}>
			<div className="input-group">
				<label htmlFor="apply-username">用户名</label>
				<input id="apply-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请实名" autoComplete="off" />
			</div>

			<div className="input-group">
				<label htmlFor="apply-password">密码</label>
				<input
					id="apply-password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="设置密码"
					autoComplete="new-password"
				/>
			</div>

			<div className="input-group">
				<label htmlFor="apply-reason">申请理由</label>
				<textarea id="apply-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请注明实名让我知道你是谁" rows={4} />
			</div>

			<button className="submit-btn" type="submit" disabled={loading}>
				{loading ? '提交中...' : '提交申请'}
			</button>
		</form>
	);
}
