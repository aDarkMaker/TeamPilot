import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { AppError } from '../server/types/api';
import { assertDepartmentOptions, parseFormConfigJson, type JoinUsFormConfig } from './formConfigSchema';

export const JOINUS_FORM_PATH = join(process.cwd(), 'public', 'joinus', 'form.json');

export async function readJoinUsFormConfig(): Promise<JoinUsFormConfig> {
	let raw: string;
	try {
		raw = await readFile(JOINUS_FORM_PATH, 'utf8');
	} catch {
		throw new AppError(500, 'FORM_READ_FAILED', '无法读取表单配置');
	}
	let json: unknown;
	try {
		json = JSON.parse(raw);
	} catch {
		throw new AppError(500, 'FORM_PARSE_FAILED', '表单配置格式错误');
	}
	return parseFormConfigJson(json);
}

export async function writeJoinUsFormConfig(config: JoinUsFormConfig): Promise<void> {
	for (const q of config.questions) {
		assertDepartmentOptions(q);
	}
	const tmp = `${JOINUS_FORM_PATH}.tmp`;
	const content = `${JSON.stringify(config, null, '\t')}\n`;
	await writeFile(tmp, content, 'utf8');
	await rename(tmp, JOINUS_FORM_PATH);
}
