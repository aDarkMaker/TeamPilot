import { z } from 'zod';
import { AppError } from '../server/types/api';
import { DEPARTMENT_OPTIONS } from './departments';

const showWhenSchema = z.object({
	questionId: z.string(),
	value: z.union([z.string(), z.array(z.string())]),
});

export const questionSchema = z.object({
	id: z.string(),
	type: z.enum(['input', 'select', 'textarea', 'file', 'boolean']),
	label: z.string(),
	required: z.boolean().optional(),
	placeholder: z.string().optional(),
	icon: z.string().optional(),
	inputType: z.enum(['text', 'tel', 'email']).optional(),
	options: z.array(z.string()).optional(),
	rows: z.number().optional(),
	accept: z.string().optional(),
	multiple: z.boolean().optional(),
	showWhen: showWhenSchema.optional(),
});

export const formConfigSchema = z.object({
	title: z.string().trim().min(1).max(80),
	subtitle: z.string().max(80).optional(),
	welcome: z.string().max(5000).optional(),
	theme: z.string().max(40).optional(),
	questions: z.array(questionSchema).min(1),
	submit: z
		.object({
			label: z.string().optional(),
			url: z.string().optional(),
			successMessage: z.string().optional(),
			successTitle: z.string().optional(),
			successSubtitle: z.string().optional(),
			successNote: z.string().optional(),
			successBackUrl: z.string().optional(),
			successBackLabel: z.string().optional(),
		})
		.optional(),
});

export type JoinUsFormConfig = z.infer<typeof formConfigSchema>;
export type JoinUsQuestion = z.infer<typeof questionSchema>;

export function assertDepartmentOptions(q: JoinUsQuestion): void {
	if (q.id !== 'department') return;
	const opts = q.options ?? [];
	if (opts.length !== DEPARTMENT_OPTIONS.length || !DEPARTMENT_OPTIONS.every((d, i) => opts[i] === d)) {
		throw new AppError(500, 'INVALID_DEPARTMENT_OPTIONS', '意向部门配置异常');
	}
}

export function parseFormConfigJson(json: unknown): JoinUsFormConfig {
	const parsed = formConfigSchema.safeParse(json);
	if (!parsed.success) {
		throw new AppError(500, 'FORM_INVALID', '表单配置无效');
	}
	for (const q of parsed.data.questions) {
		assertDepartmentOptions(q);
	}
	return parsed.data;
}
