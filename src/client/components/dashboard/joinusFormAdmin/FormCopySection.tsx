import type { JoinUsFormConfig } from '@shared/formConfigTypes';

type Props = {
	form: JoinUsFormConfig;
	onPatch: (patch: Partial<Pick<JoinUsFormConfig, 'title' | 'subtitle' | 'welcome'>>) => void;
};

/** Title / subtitle / welcome copy editor */
export function FormCopySection({ form, onPatch }: Props) {
	return (
		<section className="joinus-form-admin-card">
			<div className="joinus-form-admin-card-head">
				<h2>表单文案</h2>
			</div>
			<div className="joinus-form-admin-grid joinus-form-admin-grid-2">
				<div className="joinus-form-admin-field">
					<label htmlFor="jf-title">标题</label>
					<input id="jf-title" value={form.title} onChange={(e) => onPatch({ title: e.target.value })} />
				</div>
				<div className="joinus-form-admin-field">
					<label htmlFor="jf-subtitle">副标题</label>
					<input id="jf-subtitle" value={form.subtitle ?? ''} onChange={(e) => onPatch({ subtitle: e.target.value })} />
				</div>
				<div className="joinus-form-admin-field joinus-form-admin-field-wide">
					<label htmlFor="jf-welcome">欢迎语</label>
					<textarea id="jf-welcome" value={form.welcome ?? ''} onChange={(e) => onPatch({ welcome: e.target.value })} />
				</div>
			</div>
		</section>
	);
}
