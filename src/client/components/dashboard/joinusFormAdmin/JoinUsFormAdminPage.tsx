import { useCallback, useEffect, useMemo, useState } from 'react';

import type { JoinUsFormConfig, JoinUsQuestion } from '@shared/formConfigTypes';
import { httpJson, httpJsonVoid } from '@/lib/httpJson';
import { isStaffRole } from '@/lib/roles';
import { EMPTY_WINDOW_DRAFT, draftEndMin, findDraftConflict } from '@/lib/interview/timeslots';
import type { InterviewWindow, WindowDraft } from '@/lib/interview/timeslots';
import { DashboardToast, useDashboardToast } from '@/components/dashboard/shell/DashboardToast';
import { FormCopySection } from './FormCopySection';
import { QuestionCopyEditor } from './QuestionCopyEditor';
import { InterviewWindowSection } from './InterviewWindowSection';
import { INTERVIEW_OFFLINE_FIELD, INTERVIEW_ONLINE_FIELD } from '@shared/interviewIntro';

const toMessage = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

const isInterviewQuestion = (id: string) => id === INTERVIEW_OFFLINE_FIELD || id === INTERVIEW_ONLINE_FIELD;

export default function JoinUsFormAdminPage() {
	const [role, setRole] = useState<string | null>(null);
	const [form, setForm] = useState<JoinUsFormConfig | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const toast = useDashboardToast();

	const [windows, setWindows] = useState<InterviewWindow[]>([]);
	const [draft, setDraft] = useState<WindowDraft>(EMPTY_WINDOW_DRAFT);
	const [windowBusy, setWindowBusy] = useState(false);
	const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

	const staff = isStaffRole(role);

	const otherQuestions = useMemo(() => form?.questions.filter((q) => !isInterviewQuestion(q.id)) ?? [], [form]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				setErr(null);
				const me = await httpJson<{ role: string }>('/api/users/me', { fallbackMessage: '出了点未知状况' });
				if (cancelled) return;
				setRole(me.role);
				if (!isStaffRole(me.role)) return;
				const data = await httpJson<JoinUsFormConfig>('/api/joinus/form', { fallbackMessage: '出了点未知状况' });
				if (cancelled) return;
				setForm(data);
			} catch (e) {
				if (!cancelled) setErr(toMessage(e, '出了点未知状况'));
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const loadWindows = useCallback(async () => {
		try {
			setWindows(await httpJson<InterviewWindow[]>('/api/joinus/timeslots', { fallbackMessage: '加载排期失败' }));
		} catch (e) {
			setErr(toMessage(e, '加载排期失败'));
		}
	}, []);

	useEffect(() => {
		if (!staff) return;
		void loadWindows();
	}, [staff, loadWindows]);

	useEffect(() => {
		if (!err) return;
		toast.show({ text: err, type: 'err', durationMs: 3000 });
		setErr(null);
	}, [err, toast]);

	const patchForm = (patch: Partial<Pick<JoinUsFormConfig, 'title' | 'subtitle' | 'welcome'>>) => {
		setForm((prev) => (prev ? { ...prev, ...patch } : prev));
	};

	const patchQuestion = (id: string, patch: Partial<JoinUsQuestion>) => {
		setForm((prev) => {
			if (!prev) return prev;
			return { ...prev, questions: prev.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) };
		});
	};

	const patchDraft = (patch: Partial<WindowDraft>) => {
		setDraft((prev) => ({ ...prev, ...patch }));
	};

	const conflict = findDraftConflict(windows, draft);

	const onCreateWindow = async () => {
		const endMin = draftEndMin(draft);
		if (!draft.date || draft.startMin == null || endMin == null) {
			toast.show({ text: '请选择日期、开始时间与时段个数', type: 'err', durationMs: 2500 });
			return;
		}
		if (conflict) {
			toast.show({ text: '与已有排期重叠，请调整后重试', type: 'err', durationMs: 2500 });
			return;
		}
		setWindowBusy(true);
		try {
			await httpJson<InterviewWindow>('/api/joinus/timeslots', {
				method: 'POST',
				body: { date: draft.date, startMin: draft.startMin, endMin },
				fallbackMessage: '添加失败',
			});
			setDraft(EMPTY_WINDOW_DRAFT);
			await loadWindows();
			toast.show({ text: '已添加面试时间', type: 'ok', durationMs: 2000 });
		} catch (e) {
			setErr(toMessage(e, '添加失败'));
		} finally {
			setWindowBusy(false);
		}
	};

	const onDeleteWindow = async (windowId: string) => {
		setDeleteBusyId(windowId);
		try {
			await httpJsonVoid(`/api/joinus/timeslots/${encodeURIComponent(windowId)}`, { method: 'DELETE', fallbackMessage: '删除失败' });
			await loadWindows();
			toast.show({ text: '已删除', type: 'ok', durationMs: 2000 });
		} catch (e) {
			setErr(toMessage(e, '删除失败'));
		} finally {
			setDeleteBusyId(null);
		}
	};

	const onSave = async () => {
		if (!form || !staff) return;
		setBusy(true);
		try {
			const body = {
				title: form.title,
				subtitle: form.subtitle,
				welcome: form.welcome,
				questions: form.questions.map((q) => {
					const item: { id: string; label: string; placeholder?: string } = { id: q.id, label: q.label };
					if (q.placeholder !== undefined) item.placeholder = q.placeholder;
					return item;
				}),
			};
			const data = await httpJson<JoinUsFormConfig>('/api/joinus/form', { method: 'PUT', body, fallbackMessage: '保存失败' });
			setForm(data);
			toast.show({ text: '已保存', type: 'ok', durationMs: 2000 });
		} catch (e) {
			setErr(toMessage(e, '保存失败'));
		} finally {
			setBusy(false);
		}
	};

	if (role && !staff) {
		return <div className="tc-empty joinus-form-admin-forbidden">这里没有管理员权限哦</div>;
	}

	if (!form) {
		return <div className="tc-empty joinus-form-admin-forbidden">加载中…</div>;
	}

	return (
		<div className="tc-page joinus-form-admin">
			<DashboardToast toast={toast.toast} />
			<div className="tc-page-head">
				<div className="tc-page-head__text">
					<span className="tc-eyebrow">报名</span>
					<h1 className="tc-page-title">报名修改</h1>
				</div>
			</div>

			<FormCopySection form={form} onPatch={patchForm} />
			<QuestionCopyEditor questions={otherQuestions} onPatch={patchQuestion} />
			<InterviewWindowSection
				windows={windows}
				draft={draft}
				onDraftChange={patchDraft}
				conflict={conflict}
				addBusy={windowBusy}
				deleteBusyId={deleteBusyId}
				onAdd={() => void onCreateWindow()}
				onDelete={(id) => void onDeleteWindow(id)}
			/>

			<div className="joinus-form-admin-actions">
				<button type="button" className="joinus-form-admin-btn primary" disabled={busy} onClick={() => void onSave()}>
					{busy ? '保存中…' : '保存'}
				</button>
			</div>
		</div>
	);
}
