import { useCallback, useEffect, useState } from 'react';

import { usePolling } from '@/lib/usePolling';
import {
	BILI_QRCODE_EXPIRED,
	bindBili,
	fetchBiliQrcode,
	fetchBiliQrcodeStatus,
	fetchBiliStatus,
	fetchBiliUserInfo,
	type BiliStatus,
} from '@/lib/settings/biliClient';
import { SettingsButton } from '@/components/ui/settingsControls';

const QRCODE_POLL_INTERVAL_MS = 2500;

type Props = {
	onNotice: (notice: { type: 'ok' | 'err'; text: string }) => void;
};

/** B站 account binding: renders the QR code and polls until it is scanned or expires */
export function BiliSection({ onNotice }: Props) {
	const [status, setStatus] = useState<BiliStatus | null>(null);
	const [nickname, setNickname] = useState<string | null>(null);
	const [avatar, setAvatar] = useState<string | null>(null);
	const [qrCode, setQrCode] = useState<{ url: string; key: string } | null>(null);

	const cancel = useCallback(() => {
		setQrCode(null);
	}, []);

	const loadInfo = useCallback(
		async (bound: boolean) => {
			setStatus((prev) => (prev ? { ...prev, bound } : prev));
			try {
				const info = await fetchBiliUserInfo();
				setAvatar(info.avatar);
				setNickname(info.nickname);
			} catch {
				// ignore: the status section still works without the profile details
			}
		},
		[]
	);

	useEffect(() => {
		void (async () => {
			try {
				const s = await fetchBiliStatus();
				setStatus(s);
				if (s.bound) {
					setAvatar(s.avatar ?? null);
					setNickname(s.nickname ?? null);
				}
			} catch {
				// ignore: polling failure should not surface in the binding flow
			}
		})();
	}, []);

	const poll = useCallback(async () => {
		if (!qrCode) return;
		try {
			const s = await fetchBiliQrcodeStatus(qrCode.key);
			if (s.code === 0 && s.refreshToken) {
				try {
					await bindBili({ refreshToken: s.refreshToken, biliUid: s.biliUid ?? '', cookies: s.cookies ?? '' });
					onNotice({ type: 'ok', text: 'B站账号绑定成功！' });
					await loadInfo(true);
				} catch {
					onNotice({ type: 'err', text: '绑定未成功，请重试' });
				}
				cancel();
			} else if (s.code === BILI_QRCODE_EXPIRED) {
				onNotice({ type: 'err', text: '二维码已过期，请重新扫码' });
				cancel();
			}
		} catch {
			// ignore: transient polling errors are retried on the next tick
		}
	}, [qrCode, cancel, loadInfo, onNotice]);

	// Polls only while a QR code is on screen; an empty key makes it a no-op.
	usePolling(poll, QRCODE_POLL_INTERVAL_MS, [qrCode?.key]);

	const start = async () => {
		try {
			const qrcode = await fetchBiliQrcode();
			setQrCode({ url: qrcode.qrDataUrl, key: qrcode.qrcodeKey });
		} catch (e) {
			onNotice({ type: 'err', text: e instanceof Error ? e.message : '网络错误，请稍后再试' });
		}
	};

	if (!status?.allowed) return null;

	return (
		<section className="settings-section">
			<h2>B站账号</h2>
			{status.bound && avatar ? (
				<div className="settings-bili-bound">
					<img className="settings-bili-avatar" src={avatar} alt="" />
					<div className="settings-bili-info">
						<div className="settings-bili-nickname">{nickname ?? 'B站用户'}</div>
						<div className="settings-bili-status">已绑定</div>
					</div>
				</div>
			) : qrCode ? (
				<div className="settings-bili-qrcode-wrap">
					<img className="settings-bili-qrcode" src={qrCode.url} alt="扫码登录" />
					<div className="settings-bili-qrcode-hint">请使用B站客户端扫码登录</div>
					<SettingsButton variant="secondary" onClick={cancel}>
						取消
					</SettingsButton>
				</div>
			) : (
				<SettingsButton variant="secondary" onClick={() => void start()}>
					绑定B站账号
				</SettingsButton>
			)}
		</section>
	);
}
