import { z } from 'zod';
import { AppError } from '../types/api';
import { readJoinUsFormConfig, writeJoinUsFormConfig } from '../../joinus/formConfigIO';
import { assertDepartmentOptions, formConfigSchema, type JoinUsFormConfig } from '../../joinus/formConfigSchema';

export type { JoinUsFormConfig } from '../../joinus/formConfigSchema';

const questionPatchSchema = z.object({
	id: z.string(),
	label: z.string().trim().min(1).max(120).optional(),
	placeholder: z.string().max(200).optional(),
	options: z.array(z.string()).optional(),
});

const updateBodySchema = z.object({
	title: z.string().trim().min(1).max(80).optional(),
	subtitle: z.string().max(80).optional(),
	welcome: z.string().max(5000).optional(),
	questions: z.array(questionPatchSchema).optional(),
});

export class JoinUsFormService {
	async getForm(): Promise<JoinUsFormConfig> {
		return readJoinUsFormConfig();
	}

	async updateForm(patch: unknown): Promise<JoinUsFormConfig> {
		const parsed = updateBodySchema.safeParse(patch);
		if (!parsed.success) {
			throw new AppError(400, 'INVALID_BODY', '请求体格式不对');
		}
		const body = parsed.data;
		const base = await readJoinUsFormConfig();

		const next: JoinUsFormConfig = { ...base };

		if (body.title !== undefined) next.title = body.title;
		if (body.subtitle !== undefined) next.subtitle = body.subtitle;
		if (body.welcome !== undefined) next.welcome = body.welcome;

		if (body.questions?.length) {
			const byId = new Map(base.questions.map((q) => [q.id, q]));
			const patchIds = new Set(body.questions.map((p) => p.id));

			if (patchIds.size !== body.questions.length) {
				throw new AppError(400, 'DUPLICATE_QUESTION_ID', '题目 id 重复');
			}

			for (const p of body.questions) {
				const orig = byId.get(p.id);
				if (!orig) throw new AppError(400, 'UNKNOWN_QUESTION', `未知题目：${p.id}`);

				if (p.label !== undefined) orig.label = p.label;
				if (p.placeholder !== undefined) orig.placeholder = p.placeholder;

				if (p.options !== undefined) {
					throw new AppError(400, 'OPTIONS_NOT_EDITABLE', `${p.id} 的选项不可在此修改`);
				}
			}

			next.questions = [...base.questions];
		}

		if (next.questions.length !== base.questions.length) {
			throw new AppError(400, 'QUESTION_COUNT_CHANGED', '不可增删题目');
		}
		for (let i = 0; i < base.questions.length; i++) {
			const a = base.questions[i];
			const b = next.questions[i];
			if (!a || !b) continue;
			if (a.id !== b.id || a.type !== b.type) {
				throw new AppError(400, 'QUESTION_STRUCTURE_CHANGED', '题目结构不可修改');
			}
			if (JSON.stringify(a.showWhen) !== JSON.stringify(b.showWhen)) {
				throw new AppError(400, 'SHOW_WHEN_CHANGED', '题目显示条件不可修改');
			}
			if (JSON.stringify(a.options) !== JSON.stringify(b.options)) {
				throw new AppError(400, 'OPTIONS_CHANGED', `${a.id} 的选项不可修改`);
			}
		}

		const validated = formConfigSchema.safeParse(next);
		if (!validated.success) {
			throw new AppError(400, 'INVALID_FORM', '表单配置校验失败');
		}
		for (const q of validated.data.questions) {
			assertDepartmentOptions(q);
		}

		await writeJoinUsFormConfig(validated.data);
		return validated.data;
	}
}
