import {
	useCallback,
	useEffect,
	useId,
	useState,
	type InputHTMLAttributes,
	type TextareaHTMLAttributes,
	type ButtonHTMLAttributes,
} from "react";

import UserAvatar from "./UserAvatar";
import bgDefault from "../../assets/img/image/bg-dashboard.png";
import { assetUrl } from "../../lib/assetUrl";

type Me = {
    id: string;
    username: string;
    nickname: string | null;
    signature: string | null;
    qq: string | null;
    avatarUrl: string | null;
    profileBackgroundUrl: string | null;
    role: string;
};

type MeApi = { ok?: boolean; data?: Me };

function errText(json: unknown, fallback: string): string {
    if (json && typeof json === 'object' && 'message' in json && typeof (json as { message: string }).message === 'string') {
        return (json as { message: string }).message;
    }
    return fallback;
}

function SettingsInput(
	props: InputHTMLAttributes<HTMLInputElement> & { className?: string }
) {
	return <input {...props} className={`settings-input ${props.className ?? ""}`} />;
}

function SettingsTextarea(
	props: TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
) {
	return <textarea {...props} className={`settings-textarea ${props.className ?? ""}`} />;
}

function SettingsButton(
	props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }
) {
	const { variant = 'primary', className, ...rest } = props;
	return (
		<button
			{...rest}
			type={rest.type ?? 'button'}
			className={`settings-btn ${variant === 'secondary' ? 'secondary' : ''} ${className ?? ''}`}
		>
			{props.children}
		</button>
	);
}

function SettingsFileInput(props: {
	accept: string;
	disabled?: boolean;
	label: string;
	onPick: (file: File | null) => void;
}) {
	const { accept, disabled, label, onPick } = props;
	const id = useId();
	return (
		<div className="settings-file">
			<input
				id={id}
				type="file"
				accept={accept}
				disabled={disabled}
				onChange={(e) => onPick(e.target.files?.[0] ?? null)}
				className="settings-file-input"
			/>
			<label htmlFor={id} className={`settings-file-btn ${disabled ? 'disabled' : ''}`}>
				{label}
			</label>
		</div>
	);
}

export default function SettingsPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
	
    const [username, setUsername] = useState('');
	const [nickname, setNickname] = useState('');
	const [signature, setSignature] = useState('');
	const [qq, setQq] = useState('');
	
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [bgUrl, setBgUrl] = useState<string | null>(null);
	
    const [oldPw, setOldPw] = useState('');
	const [newPw, setNewPw] = useState('');
	const [newPw2, setNewPw2] = useState('');

	const dispatchProfileUpdated = (detail: Partial<Me>) => {
		window.dispatchEvent(new CustomEvent('hxk:profile-updated', { detail }));
	};

    const loadMe = useCallback(async () => {
        setMsg(null);
        try {
            const res = await fetch('/api/users/me', { credentials: 'include' });
            const json = (await res.json()) as MeApi;
            if (!res.ok || !json?.ok || !json.data) {
                setMsg({ type: 'err', text: errText(json, '加载失败了！') });
                return;
            }
            const u = json.data;
            setUsername(u.username);
            setNickname(u.nickname ?? '');
            setSignature(u.signature ?? '');
            setQq(u.qq ?? '');
            setAvatarUrl(u.avatarUrl);
            setBgUrl(u.profileBackgroundUrl);
        } catch (err) {
            setMsg({ type: 'err', text: '等会再试试吧！' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadMe();
    }, [loadMe]);

    const saveProfile = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const body: { nickname: string | null; signature: string | null; qq: string | null } = {
                nickname: nickname.trim() ? nickname.trim() : null,
                signature: signature.trim() ? signature.trim() : null,
                qq: qq.trim() ? qq.trim() : null,
            };
            const res = await fetch('/api/users/me', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok || !json?.ok) {
                setMsg({ type: 'err', text: errText(json, '保存失败了！') });
                return;
            }
            setMsg({ type: 'ok', text: '保存好哩！' });
            if (json.data) {
                setAvatarUrl(json.data.avatarUrl ?? null);
                setBgUrl(json.data.profileBackgroundUrl ?? null);
				dispatchProfileUpdated({
					nickname: json.data.nickname,
					signature: json.data.signature,
					qq: json.data.qq,
					avatarUrl: json.data.avatarUrl ?? null,
					profileBackgroundUrl: json.data.profileBackgroundUrl ?? null,
				});
            }
        } catch {
            setMsg({ type: 'err', text: 'Network Error' });
        } finally {
            setSaving(false);
        }
    };

    const uploadAvatar = async (file: File | null) => {
        if (!file) return;
        setSaving(true);
        setMsg(null);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch('/api/users/me/avatar', { method: 'POST', credentials: 'include', body: fd });
            const json = await res.json();
            if (!res.ok || !json?.ok) {
                setMsg({ type: 'err', text: errText(json, '头像上传失败了！') });
                return;
            }
            setMsg({ type: 'ok', text: '头像修改好哩！' });
            if (json.data) {
				setAvatarUrl(json.data.avatarUrl ?? null);
				setBgUrl(json.data.profileBackgroundUrl ?? null);
				dispatchProfileUpdated({
					nickname: json.data.nickname,
					signature: json.data.signature,
					qq: json.data.qq,
					avatarUrl: json.data.avatarUrl ?? null,
					profileBackgroundUrl: json.data.profileBackgroundUrl ?? null,
				});
			}
        } catch {
            setMsg({ type: 'err', text: '等会再试试吧！' });
        } finally {
            setSaving(false);
        }
    };

    const uploadBg = async (file: File | null) => {
        if (!file) return;
        setSaving(true);
        setMsg(null);
        const fd = new FormData();
        fd.append('bg', file);
        try {
            const res = await fetch('/api/users/me/profile-background', {
                method: 'POST',
                credentials: 'include',
                body: fd,
            });
            const json = await res.json();
            if (!res.ok || !json?.ok) {
                setMsg({ type: 'err', text: errText(json, '背景图片上传失败了！') });
                return;
            }
            setMsg({ type: 'ok', text: '背景图片上传好啦！' });
			if (json.data) {
				setBgUrl(json.data.profileBackgroundUrl ?? null);
				setAvatarUrl(json.data.avatarUrl ?? null);
				dispatchProfileUpdated({
					nickname: json.data.nickname,
					signature: json.data.signature,
					qq: json.data.qq,
					avatarUrl: json.data.avatarUrl ?? null,
					profileBackgroundUrl: json.data.profileBackgroundUrl ?? null,
				});
			}
        } catch {
            setMsg({ type: 'err', text: '等会再试试吧！' });
        } finally {
            setSaving(false);
        }
    };

    const resetAvatar = async () => {
		setSaving(true);
		setMsg(null);
		try {
			const res = await fetch('/api/users/me/avatar/reset', {
				method: 'POST',
				credentials: 'include',
			});
			const json = await res.json();
			if (!res.ok || !json?.ok) {
				setMsg({ type: 'err', text: errText(json, '头像恢复默认失败了！') });
				return;
			}
			setMsg({ type: 'ok', text: '头像恢复默认好哩！' });
			if (json.data) {
				setAvatarUrl(json.data.avatarUrl ?? null);
				setBgUrl(json.data.profileBackgroundUrl ?? null);
				dispatchProfileUpdated({
					nickname: json.data.nickname,
					signature: json.data.signature,
					qq: json.data.qq,
					avatarUrl: json.data.avatarUrl ?? null,
					profileBackgroundUrl: json.data.profileBackgroundUrl ?? null,
				});
			}
		} catch {
			setMsg({ type: 'err', text: '等会再试试吧！' });
		} finally {
			setSaving(false);
		}
	};

	const resetBg = async () => {
		setSaving(true);
		setMsg(null);
		try {
			const res = await fetch('/api/users/me/profile-background/reset', {
				method: 'POST',
				credentials: 'include',
			});
			const json = await res.json();
			if (!res.ok || !json?.ok) {
				setMsg({ type: 'err', text: errText(json, '背景恢复默认失败了！') });
				return;
			}
			setMsg({ type: 'ok', text: '背景恢复默认好哩！' });
			if (json.data) {
				setBgUrl(json.data.profileBackgroundUrl ?? null);
				setAvatarUrl(json.data.avatarUrl ?? null);
				dispatchProfileUpdated({
					nickname: json.data.nickname,
					signature: json.data.signature,
					qq: json.data.qq,
					avatarUrl: json.data.avatarUrl ?? null,
					profileBackgroundUrl: json.data.profileBackgroundUrl ?? null,
				});
			}
		} catch {
			setMsg({ type: 'err', text: '等会再试试吧！' });
		} finally {
			setSaving(false);
		}
	};

    const changePassword = async () => {
        if (newPw !== newPw2) {
            setMsg({ type: 'err', text: '两次输入的密码不一致！' });
            return;
        }
        if (oldPw && newPw && newPw === oldPw) {
            setMsg({ type: 'err', text: '一样的密码还要改吗？'});
            return;
        }
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch('/api/users/me/password', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
            });
            const json = await res.json();
            if (!res.ok || !json?.ok) {
				setMsg({ type: 'err', text: errText(json, '修改密码失败了！') });
				return;
			}
            setMsg({ type: 'ok', text: '密码修改好哩！' });
			setOldPw('');
			setNewPw('');
			setNewPw2('');
        } catch {
            setMsg({ type: 'err', text: '等会再试试吧！' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p className="settings-page">加载中……</p>;
    }

    return (
			<div className="settings-page">
				<div className="settings-card">
					{msg && <div className={`settings-top-msg ${msg.type}`}>{msg.text}</div>}

					<section className="settings-section">
						<h2>基本资料</h2>
						<div className="settings-username">实名：{username}</div>

						<div className="settings-field">
							<label htmlFor="set-nick">昵称：</label>
							<SettingsInput id="set-nick" value={nickname} onChange={(e) => setNickname(e.target.value)} />
						</div>

						<div className="settings-field">
							<label htmlFor="set-sig">个性签名：</label>
							<SettingsTextarea id="set-sig" value={signature} onChange={(e) => setSignature(e.target.value)} maxLength={200} />
						</div>

						<div className="settings-field">
							<label htmlFor="set-qq">QQ：</label>
							<SettingsInput id="set-qq" value={qq} onChange={(e) => setQq(e.target.value)}/>
						</div>

						<div className="settings-actions">
							<SettingsButton disabled={saving} onClick={() => void saveProfile()}>
								保存资料
							</SettingsButton>
						</div>
					</section>

					<section className="settings-section">
						<h2>头像</h2>
						<div className="settings-avatar-row">
							<UserAvatar username={username} avatarUrl={avatarUrl} size={72} />
							<div className="settings-actions-inline">
								<SettingsFileInput
									accept="image/jpeg,image/png,image/webp"
									disabled={saving}
									label="上传"
									onPick={(f) => void uploadAvatar(f)}
								/>
								<SettingsButton variant="secondary" disabled={saving} onClick={() => void resetAvatar()}>
									恢复默认
								</SettingsButton>
							</div>
						</div>
					</section>

					<section className="settings-section">
						<h2>自定义背景</h2>
						<div className="settings-bg-preview">
							<img
								className="settings-bg-img"
								src={bgUrl ?? assetUrl(bgDefault)}
								alt=""
								loading="lazy"
							/>
						</div>
						<div className="settings-actions-inline" style={{ marginTop: '0.85rem' }}>
							<SettingsFileInput
								accept="image/jpeg,image/png,image/webp"
								disabled={saving}
								label="上传背景"
								onPick={(f) => void uploadBg(f)}
							/>
							<SettingsButton variant="secondary" disabled={saving} onClick={() => void resetBg()}>
								恢复默认
							</SettingsButton>
						</div>
					</section>

					<section className="settings-section">
						<h2>修改密码</h2>

                        <div className="settings-field">
							<label htmlFor="old-pw">当前密码</label>
							<SettingsInput id="old-pw" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" />
						</div>

						<div className="settings-field">
							<label htmlFor="new-pw">新密码</label>
							<SettingsInput id="new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
						</div>

						<div className="settings-field">
							<label htmlFor="new-pw2">确认新密码</label>
							<SettingsInput id="new-pw2" type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} autoComplete="new-password" />
						</div>

						<div className="settings-actions">
							<SettingsButton variant="secondary" disabled={saving} onClick={() => void changePassword()}>
								更新密码
							</SettingsButton>
						</div>
					</section>
				</div>
			</div>
    );
}