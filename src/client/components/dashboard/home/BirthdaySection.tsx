import { useState } from 'react';

import type { BirthdayWish, TodayBirthdayUser } from '@/lib/home/homeClient';

type Props = {
	users: TodayBirthdayUser[];
	wishMap: Record<string, BirthdayWish[]>;
	busy: boolean;
	onSendWish: (recipientUserId: string, message: string) => Promise<boolean>;
};

/** Today's birthdays plus the per-user wish thread; returns null when nobody has one */
export function BirthdaySection({ users, wishMap, busy, onSendWish }: Props) {
	const [inputs, setInputs] = useState<Record<string, string>>({});

	if (users.length === 0) return null;

	const send = async (userId: string) => {
		const message = (inputs[userId] ?? '').trim();
		if (!message) return;
		if (await onSendWish(userId, message)) {
			setInputs((prev) => ({ ...prev, [userId]: '' }));
		}
	};

	return (
		<section className="home-card">
			<div className="home-card-head">
				<h2>今日寿星</h2>
			</div>
			<div className="home-list">
				{users.map((u) => (
					<article key={u.id} className="home-birthday-item">
						<div className="home-birthday-user">
							<div className="home-birthday-avatar">
								{u.avatarUrl ? (
									<img src={u.avatarUrl} alt="" loading="lazy" decoding="async" width={36} height={36} />
								) : (
									<span>{(u.nickname ?? u.username).slice(0, 1)}</span>
								)}
							</div>
							<div className="home-birthday-name">{u.nickname ?? u.username}</div>
						</div>
						<div className="home-birthday-wishes">
							{(wishMap[u.id] ?? []).length === 0 ? (
								<div className="home-muted">空空如也，速速送上祝福！</div>
							) : (
								(wishMap[u.id] ?? []).map((w) => (
									<div key={w.id} className="home-birthday-wish-line">
										<span className="home-birthday-wish-author">{w.author.nickname ?? w.author.username}:</span>
										<span>{w.message}</span>
									</div>
								))
							)}
						</div>
						<div className="home-birthday-send">
							<input
								className="home-input"
								placeholder={`给 ${u.nickname ?? u.username} 送上祝福`}
								value={inputs[u.id] ?? ''}
								disabled={busy}
								onChange={(e) => setInputs((prev) => ({ ...prev, [u.id]: e.target.value }))}
							/>
							<button className="home-btn" type="button" disabled={busy} onClick={() => void send(u.id)}>
								发送
							</button>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
