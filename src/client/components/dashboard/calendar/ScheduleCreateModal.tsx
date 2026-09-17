import { useEffect, useMemo, useState } from 'react';

import { PickerDialog } from '@/components/common/PickerDialog';
import { buildTimeOptions, fmtHHmm, parseHHmm } from '@/lib/calendar/timeGrid';
import type { CalendarMe, MentionUser, ScheduleScope } from './types';
import { MemberPicker } from './MemberPicker';

type Props = {
	me: CalendarMe | null;
	open: boolean;
	closing: boolean;
	/** Empty for create, set to the schedule id when editing */
	editId: string | null;
	initial: {
		title: string;
		description: string;
		location: string;
		startAt: string;
		endAt: string;
		scope: ScheduleScope;
		participants: MentionUser[];
	};
	submitting: boolean;
	error: string | null;
	onClose: () => void;
	onSubmit: (payload: {
		title: string;
		description: string;
		location: string;
		startAt: string;
		endAt: string;
		scope: ScheduleScope;
		participants: MentionUser[];
	}) => void;
};

const SCOPES: Array<{ value: ScheduleScope; label: string }> = [
	{ value: 'all', label: '全体' },
	{ value: 'custom', label: '指定' },
	{ value: 'self', label: '自己' },
];

export function ScheduleCreateModal({ me, open, closing, editId, initial, submitting, error, onClose, onSubmit }: Props) {
	const [title, setTitle] = useState(initial.title);
	const [description, setDescription] = useState(initial.description);
	const [location, setLocation] = useState(initial.location);
	const [startAt, setStartAt] = useState(initial.startAt);
	const [endAt, setEndAt] = useState(initial.endAt);
	const [scope, setScope] = useState<ScheduleScope>(initial.scope);
	const [participants, setParticipants] = useState<MentionUser[]>(initial.participants);
	const [timeField, setTimeField] = useState<'start' | 'end' | null>(null);
	const [timeClosing, setTimeClosing] = useState(false);

	// Re-sync whenever the modal is (re)opened for a different schedule.
	useEffect(() => {
		if (!open) return;
		setTitle(initial.title);
		setDescription(initial.description);
		setLocation(initial.location);
		setStartAt(initial.startAt);
		setEndAt(initial.endAt);
		setScope(initial.scope);
		setParticipants(initial.participants);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, editId]);

	const timeOptions = useMemo(() => buildTimeOptions(), []);

	const durationMinutes = useMemo(() => {
		const s = parseHHmm(startAt);
		const e = parseHHmm(endAt);
		if (s == null || e == null || e <= s) return 0;
		return Math.max(5, e - s);
	}, [startAt, endAt]);

	// Keep the end time after the start time.
	useEffect(() => {
		const s = parseHHmm(startAt);
		const e = parseHHmm(endAt);
		if (s == null || e == null || e > s) return;
		const dayEndMin = 23 * 60;
		const candidate = Math.min(s + 60, dayEndMin);
		const safeMin = candidate <= s ? Math.min(s + 5, dayEndMin) : candidate;
		const next = fmtHHmm(safeMin);
		const n = parseHHmm(next);
		if (n != null && n > s && next !== endAt) setEndAt(next);
	}, [startAt, endAt]);

	const closeTimePicker = () => {
		setTimeClosing(true);
		window.setTimeout(() => {
			setTimeField(null);
			setTimeClosing(false);
		}, 180);
	};

	// Center the selected time when the picker opens.
	useEffect(() => {
		if (timeField === null) return;
		document.querySelector<HTMLButtonElement>('.time-picker-item.active')?.scrollIntoView({ block: 'center' });
	}, [timeField]);

	// Escape closes the time picker first, then the modal itself.
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			if (timeField !== null && !timeClosing) closeTimePicker();
			else if (!closing) onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, timeField, timeClosing, closing, onClose]);

	const isStaff = Boolean(me && me.role !== 'user');

	return (
		<>
			{open ? (
				<div className={`calendar-modal ${closing ? 'closing' : 'open'}`} role="dialog" aria-modal="true" onClick={onClose}>
					<div className="calendar-modal-card" onClick={(e) => e.stopPropagation()}>
						<div className="calendar-modal-head">
							<div className="calendar-modal-title">创建日程</div>
							<button type="button" className="dash-btn" onClick={onClose}>
								关闭
							</button>
						</div>
						{error ? <div className="calendar-inline-msg err">{error}</div> : null}
						<form
							className="calendar-form"
							onSubmit={(e) => {
								e.preventDefault();
								onSubmit({ title, description, location, startAt, endAt, scope, participants });
							}}
						>
							{isStaff ? (
								<div className="calendar-field calendar-field--sticky">
									<label>范围</label>
									<div className="calendar-scope">
										{SCOPES.map((s) => (
											<button
												key={s.value}
												type="button"
												className={`calendar-scope-btn ${scope === s.value ? 'active' : ''}`}
												onClick={() => setScope(s.value)}
											>
												{s.label}
											</button>
										))}
									</div>
								</div>
							) : null}

							<div className="calendar-form-pane">
								<div className="calendar-field">
									<label htmlFor="cal-title">标题</label>
									<input id="cal-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
								</div>

								{isStaff ? (
									<div className={`calendar-members-slot${scope === 'custom' ? ' is-open' : ''}`} aria-hidden={scope !== 'custom'}>
										<div className="calendar-members-slot-inner">
											<MemberPicker
												participants={participants}
												onPick={(u) => setParticipants((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]))}
												onRemove={(userId) => setParticipants((prev) => prev.filter((p) => p.id !== userId))}
											/>
										</div>
									</div>
								) : null}

								<div className="calendar-field">
									<label htmlFor="cal-desc2">描述</label>
									<textarea id="cal-desc2" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
								</div>

								<div className="calendar-field">
									<label htmlFor="cal-loc">位置</label>
									<input id="cal-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
								</div>

								<div className="calendar-row">
									<div className="calendar-field">
										<label htmlFor="cal-start">开始</label>
										<button id="cal-start" type="button" className="calendar-time-btn" onClick={() => setTimeField('start')}>
											{startAt}
										</button>
									</div>
									<div className="calendar-field">
										<label htmlFor="cal-end">结束</label>
										<button id="cal-end" type="button" className="calendar-time-btn" onClick={() => setTimeField('end')}>
											{endAt}
										</button>
									</div>
									<div className="calendar-field">
										<label htmlFor="cal-dur">时长</label>
										<input id="cal-dur" type="text" value={`${durationMinutes} 分钟`} readOnly />
									</div>
								</div>

								<button type="submit" className="dash-btn primary calendar-form-submit" disabled={submitting}>
									{submitting ? '提交中…' : '创建'}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}

			<PickerDialog
				open={timeField !== null}
				stateClass={timeClosing ? 'closing' : 'open'}
				title={timeField === 'start' ? '开始' : '结束'}
				headerAction={
					<button type="button" className="dash-btn" onClick={closeTimePicker}>
						关闭
					</button>
				}
				onClose={closeTimePicker}
			>
				{timeOptions.map((t) => (
					<button
						key={t}
						type="button"
						className={`time-picker-item ${t === (timeField === 'start' ? startAt : endAt) ? 'active' : ''}`}
						onClick={() => {
							if (timeField === 'start') {
								setStartAt(t);
								const s = parseHHmm(t);
								const e = parseHHmm(endAt);
								if (s != null && e != null && e <= s) setEndAt(fmtHHmm(s + 60));
							} else {
								setEndAt(t);
							}
							closeTimePicker();
						}}
					>
						{t}
					</button>
				))}
			</PickerDialog>
		</>
	);
}
