import type { JoinUsQuestion } from '@shared/formConfigTypes';

const PLACEHOLDER_TYPES = new Set(['input', 'select', 'boolean', 'file']);

type Props = {
	questions: JoinUsQuestion[];
	onPatch: (id: string, patch: Partial<JoinUsQuestion>) => void;
};

function showWhenText(q: JoinUsQuestion): string {
	if (!q.showWhen) return '—';
	const v = Array.isArray(q.showWhen.value) ? q.showWhen.value.join(' / ') : q.showWhen.value;
	return `当 ${q.showWhen.questionId} = ${v}`;
}

/** Label / placeholder editor for every non-interview question */
export function QuestionCopyEditor({ questions, onPatch }: Props) {
	return (
		<section className="joinus-form-admin-card">
			<div className="joinus-form-admin-card-head">
				<h2>题目文案</h2>
			</div>
			{questions.map((q) => (
				<div key={q.id} className="joinus-form-admin-question">
					<div className="joinus-form-admin-question-meta">
						{q.id} · {q.type}
						{q.showWhen ? ` · ${showWhenText(q)}` : ''}
					</div>
					<div className="joinus-form-admin-grid joinus-form-admin-grid-2">
						<div className="joinus-form-admin-field">
							<label>标签</label>
							<input value={q.label} onChange={(e) => onPatch(q.id, { label: e.target.value })} />
						</div>
						{PLACEHOLDER_TYPES.has(q.type) && (
							<div className="joinus-form-admin-field">
								<label>占位提示</label>
								<input value={q.placeholder ?? ''} onChange={(e) => onPatch(q.id, { placeholder: e.target.value })} />
							</div>
						)}
					</div>
				</div>
			))}
		</section>
	);
}
