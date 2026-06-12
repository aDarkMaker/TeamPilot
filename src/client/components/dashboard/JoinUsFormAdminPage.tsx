import { useEffect, useMemo, useState } from 'react';
import type { FormConfig, Question } from '../../lib/joinus/form';
import { DashboardToast, useDashboardToast } from './DashboardToast';
import { INTERVIEW_OFFLINE_FIELD, INTERVIEW_ONLINE_FIELD } from '../../../joinus/interviewIntro';

type Role = 'user' | 'admin' | 'super_admin';
type Me = { role: Role };

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
	const res = await fetch(input, { credentials: 'include', ...init });
	const json = await res.json().catch(() => ({}));
	if (!res.ok || !json?.ok) {
		const m = typeof json?.message === 'string' && json.message ? json.message : '请求失败了，稍后再试';
		throw new Error(m);
	}
	return json.data as T;
}

function isStaff(role: Role | undefined) {
	return role === 'admin' || role === 'super_admin';
}

function isInterviewQuestion(id: string) {
	return id === INTERVIEW_OFFLINE_FIELD || id === INTERVIEW_ONLINE_FIELD;
}

function showWhenText(q: Question): string {
	if (!q.showWhen) return '—';
	const v = Array.isArray(q.showWhen.value) ? q.showWhen.value.join(' / ') : q.showWhen.value;
	return `当 ${q.showWhen.questionId} = ${v}`;
}

export default function JoinUsFormAdminPage() {
	const [me, setMe] = useState<Me | null>(null);
	const [form, setForm] = useState<FormConfig | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const toast = useDashboardToast();

	const staff = isStaff(me?.role);

	const interviewQuestions = useMemo(() => form?.questions.filter((q) => isInterviewQuestion(q.id)) ?? [], [form]);

	const otherQuestions = useMemo(() => form?.questions.filter((q) => !isInterviewQuestion(q.id)) ?? [], [form]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				setErr(null);
				const meData = await api<Me>('/api/users/me');
				if (cancelled) return;
				setMe(meData);
				if (!isStaff(meData.role)) return;
				const data = await api<FormConfig>('/api/joinus/form');
				if (cancelled) return;
				setForm(data);
			} catch (e) {
				if (!cancelled) setErr(e instanceof Error ? e.message : '出了点未知状况');
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!err) return;
		toast.show({ text: err, type: 'err', durationMs: 3000 });
		setErr(null);
	}, [err, toast]);

	const updateQuestion = (id: string, patch: Partial<Question>) => {
		setForm((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				questions: prev.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
			};
		});
	};

	const updateOption = (questionId: string, index: number, value: string) => {
		setForm((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				questions: prev.questions.map((q) => {
					if (q.id !== questionId) return q;
					const opts = [...(q.options ?? [])];
					opts[index] = value;
					return { ...q, options: opts };
				}),
			};
		});
	};

	const addOption = (questionId: string) => {
		setForm((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				questions: prev.questions.map((q) => {
					if (q.id !== questionId) return q;
					return { ...q, options: [...(q.options ?? []), ''] };
				}),
			};
		});
	};

	const removeOption = (questionId: string, index: number) => {
		setForm((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				questions: prev.questions.map((q) => {
					if (q.id !== questionId) return q;
					const opts = (q.options ?? []).filter((_, i) => i !== index);
					return { ...q, options: opts };
				}),
			};
		});
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
					const item: { id: string; label: string; placeholder?: string; options?: string[] } = {
						id: q.id,
						label: q.label,
					};
					if (q.placeholder !== undefined) item.placeholder = q.placeholder;
					if (isInterviewQuestion(q.id) && q.options) item.options = q.options;
					return item;
				}),
			};
			const data = await api<FormConfig>('/api/joinus/form', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			setForm(data);
			toast.show({ text: '已保存', type: 'ok', durationMs: 2000 });
		} catch (e) {
			setErr(e instanceof Error ? e.message : '保存失败');
		} finally {
			setBusy(false);
		}
	};

	if (me && !staff) {
		return <p className="joinus-form-admin-forbidden">这里没有管理员权限哦</p>;
	}

	if (!form) {
		return <p className="joinus-form-admin-forbidden">{me ? '加载中…' : '加载中…'}</p>;
	}

	return (
		<div className="joinus-form-admin">
			<DashboardToast toast={toast.toast} />

			<section className="joinus-form-admin-card">
				<div className="joinus-form-admin-card-head">
					<h2>表单文案</h2>
				</div>
				<div className="joinus-form-admin-grid">
					<div className="joinus-form-admin-field">
						<label htmlFor="jf-title">标题</label>
						<input id="jf-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
					</div>
					<div className="joinus-form-admin-field">
						<label htmlFor="jf-subtitle">副标题</label>
						<input id="jf-subtitle" value={form.subtitle ?? ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
					</div>
					<div className="joinus-form-admin-field">
						<label htmlFor="jf-welcome">欢迎语</label>
						<textarea id="jf-welcome" value={form.welcome ?? ''} onChange={(e) => setForm({ ...form, welcome: e.target.value })} />
					</div>
				</div>
			</section>

			<section className="joinus-form-admin-card">
				<div className="joinus-form-admin-card-head">
					<h2>题目文案</h2>
				</div>
				{otherQuestions.map((q) => (
					<div key={q.id} className="joinus-form-admin-question">
						<div className="joinus-form-admin-question-meta">
							{q.id} · {q.type}
							{q.showWhen ? ` · ${showWhenText(q)}` : ''}
							{q.options?.length ? ` · 选项只读` : ''}
						</div>
						<div className="joinus-form-admin-grid joinus-form-admin-grid-2">
							<div className="joinus-form-admin-field">
								<label>标签</label>
								<input value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })} />
							</div>
							{(q.type === 'input' || q.type === 'select' || q.type === 'boolean' || q.type === 'file') && (
								<div className="joinus-form-admin-field">
									<label>占位提示</label>
									<input value={q.placeholder ?? ''} onChange={(e) => updateQuestion(q.id, { placeholder: e.target.value })} />
								</div>
							)}
						</div>
					</div>
				))}
			</section>

			<section className="joinus-form-admin-card">
				<div className="joinus-form-admin-card-head">
					<h2>面试时间选项</h2>
				</div>
				{interviewQuestions.map((q) => (
					<div key={q.id} className="joinus-form-admin-question">
						<div className="joinus-form-admin-question-meta">
							{q.id} · {showWhenText(q)}
						</div>
						<div className="joinus-form-admin-grid joinus-form-admin-grid-2">
							<div className="joinus-form-admin-field">
								<label>标签</label>
								<input value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })} />
							</div>
							<div className="joinus-form-admin-field">
								<label>占位提示</label>
								<input value={q.placeholder ?? ''} onChange={(e) => updateQuestion(q.id, { placeholder: e.target.value })} />
							</div>
						</div>
						<span className="joinus-form-admin-options-label">选项</span>
						<div className="joinus-form-admin-options">
							{(q.options ?? []).map((opt, i) => (
								<div key={`${q.id}-${i}`} className="joinus-form-admin-option-row">
									<input value={opt} onChange={(e) => updateOption(q.id, i, e.target.value)} />
									<button
										type="button"
										className="joinus-form-admin-btn danger small"
										disabled={(q.options ?? []).length <= 1}
										onClick={() => removeOption(q.id, i)}
									>
										删除
									</button>
								</div>
							))}
							<button type="button" className="joinus-form-admin-btn small" onClick={() => addOption(q.id)}>
								添加选项
							</button>
						</div>
					</div>
				))}
			</section>

			<div className="joinus-form-admin-actions">
				<button type="button" className="joinus-form-admin-btn primary" disabled={busy} onClick={() => void onSave()}>
					{busy ? '保存中…' : '保存'}
				</button>
			</div>
		</div>
	);
}
