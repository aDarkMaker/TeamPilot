import { useCallback, useEffect, useState } from 'react';

import { broadcastScheduleUpdated, type ScheduleDayItem } from '@/lib/scheduleStore';
import { useCalendarWeek } from '@/lib/calendar/useCalendarWeek';
import { DAY_END_MIN, DAY_START_MIN, clamp } from '@/lib/calendar/dateGrid';
import { fmtHHmm, parseHHmm } from '@/lib/calendar/timeGrid';
import { cancelSchedule, createSchedule, fetchMe, updateSchedule, type ScheduleWriteBody } from '@/lib/calendar/calendarClient';
import { useSearchHighlight } from '@/lib/useSearchHighlight';
import { DashboardToast, useDashboardToast } from '@/components/dashboard/shell/DashboardToast';
import { WeekToolbar } from './WeekToolbar';
import { WeekGrid } from './WeekGrid';
import { ScheduleCreateModal } from './ScheduleCreateModal';
import { ScheduleDetailModal } from './ScheduleDetailModal';
import type { CalendarMe, DraftRange, MentionUser, ScheduleScope } from './types';
import type { BlockLayout } from '@/lib/calendar/blockLayout';

type CreateFormState = {
	title: string;
	description: string;
	location: string;
	startAt: string;
	endAt: string;
	scope: ScheduleScope;
	participants: MentionUser[];
};

const EMPTY_FORM: CreateFormState = {
	title: '',
	description: '',
	location: '',
	startAt: '09:00',
	endAt: '10:00',
	scope: 'self',
	participants: [],
};

export default function Calendar() {
	const { highlightText } = useSearchHighlight();
	const toast = useDashboardToast();
	const week = useCalendarWeek();
	const { dayKeys, rowsByDay, selectedYmd, setSelectedYmd, activeDayIdx, loadWeek, error } = week;

	const [me, setMe] = useState<CalendarMe | null>(null);
	const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
	const [editId, setEditId] = useState<string | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [closingCreate, setClosingCreate] = useState(false);
	const [detail, setDetail] = useState<ScheduleDayItem | null>(null);
	const [closingDetail, setClosingDetail] = useState(false);
	const [draftRange, setDraftRange] = useState<DraftRange | null>(null);
	const [flash, setFlash] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

	useEffect(() => {
		fetchMe()
			.then(setMe)
			.catch(() => setMe(null));
	}, []);

	// Release the drag-draft when the pointer is lifted outside a day column.
	useEffect(() => {
		if (!draftRange?.active) return;
		const onUp = () => setDraftRange((prev) => (prev?.active ? { ...prev, active: false } : prev));
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
		return () => {
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
		};
	}, [draftRange?.active]);

	useEffect(() => {
		if (error) setFlash({ text: error, type: 'err' });
	}, [error]);

	useEffect(() => {
		if (!flash) return;
		toast.show({ text: flash.text, type: flash.type, durationMs: 3000 });
		setFlash(null);
	}, [flash, toast]);

	const closeCreate = useCallback(() => {
		setClosingCreate(true);
		window.setTimeout(() => {
			setModalOpen(false);
			setClosingCreate(false);
		}, 180);
	}, []);

	const closeDetail = useCallback(() => {
		setClosingDetail(true);
		window.setTimeout(() => {
			setDetail(null);
			setClosingDetail(false);
		}, 180);
	}, []);

	/** Opens the create modal pre-filled for a dragged range */
	const openCreateAt = (day: { year: number; month: number; day: number }, startMin: number, endMin: number) => {
		const safeStart = clamp(startMin, DAY_START_MIN, DAY_END_MIN - 30);
		const safeEnd = clamp(Math.max(endMin, safeStart + 30), safeStart + 30, DAY_END_MIN);
		setSelectedYmd(day);
		setEditId(null);
		setCreateError(null);
		setForm({ ...EMPTY_FORM, startAt: fmtHHmm(safeStart), endAt: fmtHHmm(safeEnd) });
		setModalOpen(true);
	};

	const onSubmit = async (payload: CreateFormState) => {
		setSubmitting(true);
		setCreateError(null);
		try {
			const sMin = parseHHmm(payload.startAt);
			const eMin = parseHHmm(payload.endAt);
			if (sMin == null || eMin == null || eMin <= sMin) {
				setCreateError('时间旅行者来了');
				return;
			}

			const effectiveScope: ScheduleScope = me?.role === 'user' ? 'self' : payload.scope;
			const body: ScheduleWriteBody = {
				title: payload.title,
				scope: effectiveScope,
				participantIds: effectiveScope === 'custom' ? payload.participants.map((p) => p.id) : [],
				description: payload.description || null,
				year: selectedYmd.year,
				month: selectedYmd.month,
				day: selectedYmd.day,
				startAt: payload.startAt,
				endAt: payload.endAt,
				durationMinutes: Math.max(5, eMin - sMin),
				location: payload.location || null,
			};

			if (editId) await updateSchedule(editId, body);
			else await createSchedule(body);

			setFlash({ text: editId ? '已更新' : '已创建', type: 'ok' });
			setEditId(null);
			setForm(EMPTY_FORM);
			closeCreate();
			broadcastScheduleUpdated();
			await loadWeek();
		} catch (e) {
			setCreateError(e instanceof Error ? e.message : '提交失败');
		} finally {
			setSubmitting(false);
		}
	};

	const onCancelSchedule = async (id: string) => {
		try {
			await cancelSchedule(id);
			setFlash({ text: '已取消', type: 'ok' });
			closeDetail();
			broadcastScheduleUpdated();
			await loadWeek();
		} catch (e) {
			setFlash({ text: e instanceof Error ? e.message : '取消失败', type: 'err' });
		}
	};

	const onEdit = (item: ScheduleDayItem) => {
		setEditId(item.id);
		setForm({
			title: item.title,
			description: item.description ?? '',
			location: item.location ?? '',
			startAt: item.startAt,
			endAt: item.endAt,
			scope: 'custom',
			participants: (item.participants ?? []).map((p) => ({
				id: p.userId,
				username: p.username,
				avatarUrl: p.avatarUrl ?? null,
			})),
		});
		setCreateError(null);
		setModalOpen(true);
		closeDetail();
	};

	const onPickBlock = (layout: BlockLayout) => setDetail(layout.item);

	return (
		<div className="tc-page calendar-page">
			<DashboardToast toast={toast.toast} />
			<div className="tc-page-head">
				<div className="tc-page-head__text">
					<span className="tc-eyebrow">排期</span>
					<h1 className="tc-page-title">日程安排</h1>
				</div>
			</div>

			<WeekToolbar
				dateLabel={week.dateLabel}
				showBackToday={week.showBackToday}
				onShiftWeek={week.shiftWeek}
				onBackToday={week.goToday}
				onAdd={() => {
					setEditId(null);
					setCreateError(null);
					setForm(EMPTY_FORM);
					setModalOpen(true);
				}}
			/>

			<WeekGrid
				dayKeys={dayKeys}
				rowsByDay={rowsByDay}
				activeDayIdx={activeDayIdx}
				weekDir={week.weekDir}
				selectedYmd={selectedYmd}
				draftRange={draftRange}
				onSelectDay={setSelectedYmd}
				onDraftChange={setDraftRange}
				onDraftCommit={openCreateAt}
				onPickBlock={onPickBlock}
				highlightText={highlightText}
			/>

			<ScheduleCreateModal
				me={me}
				open={modalOpen}
				closing={closingCreate}
				editId={editId}
				initial={form}
				submitting={submitting}
				error={createError}
				onClose={closeCreate}
				onSubmit={(payload) => void onSubmit(payload)}
			/>

			<ScheduleDetailModal
				detail={detail}
				closing={closingDetail}
				meId={me?.id ?? null}
				onClose={closeDetail}
				onEdit={onEdit}
				onCancel={(id) => void onCancelSchedule(id)}
				highlightText={highlightText}
			/>
		</div>
	);
}
