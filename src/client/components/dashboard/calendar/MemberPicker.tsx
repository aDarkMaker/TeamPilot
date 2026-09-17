import { useCallback, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import { roleShortLabel } from '@/lib/roles';
import { searchScheduleUsers } from '@/lib/calendar/calendarClient';
import { useAnchoredPanel, type AnchoredPanelRect } from '@/lib/useAnchoredPanel';
import type { MentionUser } from './types';

type Props = {
	participants: MentionUser[];
	onPick: (user: MentionUser) => void;
	onRemove: (userId: string) => void;
};

const PANEL_MAX_HEIGHT = 220;
const PANEL_MIN_HEIGHT = 120;

function measurePanel(trigger: HTMLElement): AnchoredPanelRect {
	const rect = trigger.getBoundingClientRect();
	const spaceBelow = window.innerHeight - rect.bottom - 8;
	return {
		top: rect.bottom + 6,
		bottom: 'auto',
		left: rect.left,
		width: rect.width,
		maxHeight: Math.min(PANEL_MAX_HEIGHT, Math.max(PANEL_MIN_HEIGHT, spaceBelow)),
		placement: 'down',
	};
}

/**
 * Member chips input with an anchored @-mention suggestion panel.
 * Owns its own search query, candidate list, keyboard navigation and panel lifecycle.
 */
export function MemberPicker({ participants, onPick, onRemove }: Props) {
	const { open, rect, rootRef, triggerRef, setPanelEl, openPanel, requestClose } = useAnchoredPanel<HTMLDivElement>({
		leaveClass: 'is-leave',
		measure: measurePanel,
	});

	const [query, setQuery] = useState('');
	const [candidates, setCandidates] = useState<MentionUser[]>([]);
	const [highlight, setHighlight] = useState(0);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const loadedAvatars = useRef<Map<string, string>>(new Map());
	const [, forceAvatarTick] = useState(0);

	const available = useMemo(() => candidates.filter((u) => !participants.some((p) => p.id === u.id)), [candidates, participants]);
	const listVisible = open && available.length > 0;

	const runSearch = useCallback(
		async (keyword: string) => {
			try {
				const users = await searchScheduleUsers(keyword);
				setCandidates(users);
				if (users.filter((u) => !participants.some((p) => p.id === u.id)).length === 0) {
					requestClose();
					return;
				}
				setHighlight(0);
				openPanel();
			} catch {
				requestClose();
			}
		},
		[participants, openPanel, requestClose]
	);

	const pick = (user: MentionUser) => {
		onPick(user);
		requestClose();
		setQuery('');
		queueMicrotask(() => inputRef.current?.focus());
	};

	const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') {
			requestClose();
			return;
		}
		if (e.key === 'Backspace' && !query && participants.length) {
			e.preventDefault();
			onRemove(participants[participants.length - 1]!.id);
			return;
		}
		if (!listVisible) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setHighlight((i) => (i + 1) % available.length);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setHighlight((i) => (i - 1 + available.length) % available.length);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const u = available[highlight];
			if (u) pick(u);
		}
	};

	return (
		<div className="calendar-field">
			<label htmlFor="cal-members">成员</label>
			<div ref={rootRef} className="calendar-members">
				<div ref={triggerRef} className="calendar-members-chips" onClick={() => inputRef.current?.focus()}>
					{participants.map((p) => {
						const name = p.nickname?.trim() || p.username;
						return (
							<span key={p.id} className="calendar-chip">
								<span className="calendar-chip-avatar" aria-hidden>
									{p.avatarUrl ? (
										<img src={p.avatarUrl} alt="" decoding="async" loading="lazy" width={20} height={20} />
									) : (
										<span>{name.slice(0, 1)}</span>
									)}
								</span>
								<span className="calendar-chip-name">{name}</span>
								<button
									type="button"
									className="calendar-chip-remove"
									aria-label={`移除 ${name}`}
									onClick={(e) => {
										e.stopPropagation();
										onRemove(p.id);
									}}
								>
									×
								</button>
							</span>
						);
					})}
					<input
						ref={inputRef}
						id="cal-members"
						className="calendar-members-input"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							void runSearch(e.target.value);
						}}
						onKeyDown={onKeyDown}
						placeholder={participants.length ? '继续搜索' : '搜索成员'}
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck={false}
						inputMode="text"
						onFocus={() => void runSearch(query)}
						onBlur={() => window.setTimeout(() => requestClose(), 150)}
					/>
				</div>
			</div>

			{listVisible && rect && typeof document !== 'undefined'
				? (createPortal(
						<div
							ref={setPanelEl}
							className="calendar-mention-list is-fixed"
							role="listbox"
							style={{
								position: 'fixed',
								left: rect.left,
								top: rect.top,
								width: rect.width,
								maxHeight: rect.maxHeight,
								zIndex: 3100,
							}}
						>
							{available.map((u, i) => {
								const name = u.nickname?.trim() || u.username;
								const previous = loadedAvatars.current.get(u.id);
								const loaded = Boolean(previous && u.avatarUrl && previous === u.avatarUrl);
								if (previous && u.avatarUrl && previous !== u.avatarUrl) loadedAvatars.current.delete(u.id);
								return (
									<button
										key={u.id}
										type="button"
										role="option"
										aria-selected={i === highlight}
										className={`calendar-mention-row${i === highlight ? ' is-active' : ''}`}
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => pick(u)}
										onMouseEnter={() => setHighlight(i)}
									>
										<span className="avatar">
											{u.avatarUrl ? (
												<img
													className={`avatar-img ${loaded ? 'loaded' : ''}`}
													src={u.avatarUrl}
													alt=""
													decoding="async"
													loading="eager"
													onLoad={() => {
														if (!u.avatarUrl) return;
														loadedAvatars.current.set(u.id, u.avatarUrl);
														forceAvatarTick((x) => x + 1);
													}}
												/>
											) : null}
											<span className="avatar-fallback">{u.username.slice(0, 1)}</span>
										</span>
										<span className="name">{name}</span>
										<span className={`role ${u.role ?? 'user'}`}>{roleShortLabel(u.role)}</span>
									</button>
								);
							})}
						</div>,
						document.body
					) as React.ReactNode)
				: null}
		</div>
	);
}
