import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
});

const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	gray: '\x1b[90m',
};

const log = {
	red: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
	green: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
	yellow: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
	blue: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
	magenta: (msg) => console.log(`${colors.magenta}${msg}${colors.reset}`),
	gray: (msg) => console.log(`${colors.gray}${msg}${colors.reset}`),
};

const TYPE_CHOICES = [
	'feat      - 新功能',
	'fix       - Bug 修复',
	'refactor  - 重构',
	'perf      - 性能优化',
	'test      - 测试',
	'docs      - 文档',
	'build     - 构建/依赖',
	'chore     - 杂项',
	'style     - 代码风格',
];

const SCOPE_CHOICES = [
	'web       - Astro 前端',
	'api       - 服务端接口',
	'auth      - 认证/权限',
	'team      - 团队/成员',
	'task      - 任务/评论',
	'db        - SQL schema/migration',
	'cache     - Redis 缓存/队列',
	'infra     - 脚本/配置/CI',
	'docs      - 文档',
	'无',
];

function normalizePath(p) {
	return p.replaceAll('\\', '/').toLowerCase();
}

function inferScopeFromPath(filePath) {
	const p = normalizePath(filePath);

	if (p.includes('astro') || p.includes('/web/') || p.includes('/src/pages/') || p.includes('/src/components/')) {
		return 'web';
	}
	if (p.includes('/api/') || p.includes('/backend/') || p.includes('/server/')) {
		return 'api';
	}
	if (p.includes('auth') || p.includes('login') || p.includes('token') || p.includes('session')) {
		return 'auth';
	}
	if (p.includes('team') || p.includes('member') || p.includes('invite')) {
		return 'team';
	}
	if (p.includes('task') || p.includes('comment') || p.includes('kanban') || p.includes('board')) {
		return 'task';
	}
	if (p.includes('schema') || p.includes('migration') || p.includes('prisma') || p.includes('drizzle') || p.includes('sql')) {
		return 'db';
	}
	if (p.includes('redis') || p.includes('cache') || p.includes('queue') || p.includes('bull')) {
		return 'cache';
	}
	if (
		p.includes('docker') ||
		p.includes('.github/') ||
		p.includes('eslint') ||
		p.includes('prettier') ||
		p.includes('vite') ||
		p.includes('tsconfig') ||
		p.includes('package.json') ||
		p.includes('bun.lock') ||
		p.includes('pnpm-lock')
	) {
		return 'infra';
	}
	if (p.endsWith('.md') || p.includes('/docs/')) {
		return 'docs';
	}

	return '';
}

function runEslint(files) {
	const lintable = files.filter((f) => /\.(js|ts|jsx|tsx|cjs|mjs)$/i.test(f));
	if (lintable.length === 0) return true;
	try {
		execSync(`bunx eslint ${lintable.map((f) => `"${f}"`).join(' ')}`, {
			encoding: 'utf8',
			stdio: 'inherit',
		});
		return true;
	} catch (e) {
		return e.status;
	}
}

async function getChangedFiles() {
	try {
		const stdout = execSync('git status --short -uall', { encoding: 'utf8' });
		if (!stdout) return [];

		return stdout
			.split('\n')
			.filter((line) => line.trim().length > 0)
			.map((line) => {
				const status = line.slice(0, 2);
				const filePath = line.slice(3).trim();
				return { status, path: filePath };
			});
	} catch (_e) {
		return [];
	}
}

async function selectFromList(message, choices) {
	console.log(`\n${message}`);
	choices.forEach((choice, index) => {
		console.log(`${index + 1}. ${choice}`);
	});

	while (true) {
		const answer = await rl.question(`Select (1-${choices.length}): `);
		const index = parseInt(answer) - 1;
		if (index >= 0 && index < choices.length) {
			return choices[index];
		}
		console.log(colors.red + 'Invalid selection, try again.' + colors.reset);
	}
}

async function run() {
	try {
		log.yellow('Resetting staging area...');
		try {
			execSync('git reset');
		} catch (_e) {
			log.red('Reset failed.');
		}

		let files = await getChangedFiles();
		if (files.length === 0) {
			log.green('No changes found.');
			process.exit(0);
		}

		log.blue(`Found ${files.length} changed files, processing one by one...\n`);

		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			let checkStatus = '';
			try {
				checkStatus = execSync(`git status --short "${file.path}"`, {
					encoding: 'utf8',
				});
			} catch (_e) {
				continue;
			}
			if (!checkStatus.trim()) continue;

			log.gray(`\n[${i + 1}/${files.length}] --------------------------------`);
			log.magenta(`File path: ${file.path}`);

			const actionIdx = await selectFromList('How to handle this change?', [
				'Commit this file',
				'Commit all files in the same directory',
				'Skip',
				'Exit process',
			]);

			if (actionIdx === 'Exit process') break;
			if (actionIdx === 'Skip') continue;

			let filesToCommit = [file.path];
			let targetDisplay = file.path;

			if (actionIdx === 'Commit all files in the same directory') {
				const dir = path.dirname(file.path);
				const sameDirFiles = files.filter((f) => path.dirname(f.path) === dir);
				filesToCommit = sameDirFiles.map((f) => f.path);
				targetDisplay = `${dir}${path.sep}* (${filesToCommit.length} files)`;
			}

			const typeChoice = await selectFromList('Type (conventional commits):', TYPE_CHOICES);
			const type = typeChoice.split(/\s+/)[0];

			const inferredScope = inferScopeFromPath(file.path);
			const scopeChoices = inferredScope
				? [`${inferredScope} (推荐)`, ...SCOPE_CHOICES.filter((c) => c.split(/\s+/)[0] !== inferredScope)]
				: SCOPE_CHOICES;
			const scopeChoice = await selectFromList('Scope (按项目架构):', scopeChoices);
			const rawScope = scopeChoice.replace(' (推荐)', '');
			const scope = rawScope === '无' ? '' : rawScope.split(/\s+/)[0];

			let description = '';
			while (true) {
				description = await rl.question(`Description for ${targetDisplay}: `);
				if (description.trim()) break;
				console.log(colors.red + 'Description cannot be empty' + colors.reset);
			}

			const commitMsg = scope ? `${type}(${scope}): ${description.trim()}` : `${type}: ${description.trim()}`;

			log.blue(`Committing...`);
			for (const f of filesToCommit) {
				try {
					execSync(`git add "${f}"`);
				} catch (_e) {
					log.red(`Add ${f} failed.`);
				}
			}

			if (!runEslint(filesToCommit)) {
				log.red('Lint failed.');
				continue;
			}

			try {
				execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
			} catch (_e) {
				log.red('Commit failed.');
			}
		}

		const pushAnswer = await rl.question('\nProcessing finished, push to remote repository? (Y/n): ');
		if (pushAnswer.toLowerCase() !== 'n') {
			log.blue('Pushing...');
			try {
				execSync('git push', { stdio: 'inherit' });
				log.green('All pushed successfully!');
			} catch (_e) {
				log.red('Push failed.');
			}
		}
	} catch (error) {
		log.red(`\nError: ${error.message}`);
		process.exit(1);
	} finally {
		rl.close();
	}
}

run();
