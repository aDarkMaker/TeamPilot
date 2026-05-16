#!/usr/bin/env node

import { execSync, spawnSync } from 'node:child_process';
import { statSync, existsSync, unlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG = {
	sshHost: 'Huaxiaoke',
	remoteZipPath: '/home/ubuntu/hxk-release.zip',
	remoteProjectDir: '/home/ubuntu/hxktoolbox',
	localZipName: 'hxk-release.zip',
	buildCommand: 'bun run build',
};

function run(cmd, opts = {}) {
	console.log(`\n→ ${cmd}\n`);
	execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

function hasBun() {
	try {
		execSync('bun --version', { stdio: 'pipe' });
		return true;
	} catch {
		return false;
	}
}

function zipProject(rootDir, zipPath) {
	const name = basename(zipPath);
	const excludePatterns = [
		name,
		`*/${name}`,
		'node_modules/*',
		'.git/*',
		'.git',
		'data/*',
		'.cursor/*',
		'.astro/*',
		'*.zip',
	];
	const zipArgs = ['-r', zipPath, '.'];
	for (const pat of excludePatterns) {
		zipArgs.push('-x', pat);
	}
	const prev = process.cwd();
	process.chdir(rootDir);
	try {
		console.log(`\n→ zip ${zipArgs.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}\n`);
		const zr = spawnSync('zip', zipArgs, { stdio: 'inherit', shell: false });
		if (zr.status !== 0) {
			throw new Error(`zip 退出码 ${zr.status}`);
		}
		const st = statSync(zipPath);
		console.log(`\n打包完成: ${zipPath} (${(st.size / 1024 / 1024).toFixed(2)} MB)\n`);
	} finally {
		process.chdir(prev);
	}
}

function remoteDeployScript(resetDb) {
	const dbBlock = resetDb
		? `sudo rm -f ${CONFIG.remoteProjectDir}/data/hxktoolbox.sqlite \\
           ${CONFIG.remoteProjectDir}/data/hxktoolbox.sqlite-wal \\
           ${CONFIG.remoteProjectDir}/data/hxktoolbox.sqlite-shm`
		: `:`;
	return `set -e
cd /home/ubuntu
rm -rf /home/ubuntu/hxk_release_tmp
mkdir -p /home/ubuntu/hxk_release_tmp
unzip -o ${CONFIG.remoteZipPath} -d /home/ubuntu/hxk_release_tmp
rsync -av \\
  --exclude '.env' \\
  --exclude '.env.production' \\
  --exclude 'data/' \\
  --exclude 'node_modules/' \\
  /home/ubuntu/hxk_release_tmp/ ${CONFIG.remoteProjectDir}/
cd ${CONFIG.remoteProjectDir}
docker-compose down --remove-orphans
docker ps -a --format '{{.Names}}' | grep hxktoolbox | xargs -r docker rm -f
${dbBlock}
docker-compose build --no-cache
docker-compose up -d
docker image prune -af
docker builder prune -af
echo "部署完成."
`;
}

function ensureProductionEnv(rootDir) {
	const envPath = join(rootDir, '.env');
	const content = readFileSync(envPath, 'utf-8');
	const lines = content.split(/\r?\n/);
	let changed = false;
	const fixed = lines.map((line) => {
		const m = line.match(/^NODE_ENV\s*=\s*(.+)$/);
		if (m && m[1].trim() !== 'production') {
			changed = true;
			return 'NODE_ENV=production';
		}
		return line;
	});
	if (!changed) return;
	console.log('\n⚠  .env 中 NODE_ENV 不是 production，已自动修正。\n');
	writeFileSync(envPath, fixed.join('\n'), 'utf-8');
}

function main() {
	const root = resolve(__dirname, '..');
	const args = new Set(process.argv.slice(2));
	const noBuild = args.has('--no-build');
	const uploadOnly = args.has('--upload-only');
	const deployOnly = args.has('--deploy-only');
	const resetDb = args.has('--reset-db');

	const zipPath = join(root, CONFIG.localZipName);

	if (uploadOnly && deployOnly) {
		process.exit(1);
	}

	if (deployOnly) {
		const script = remoteDeployScript(resetDb);
		const r = spawnSync('ssh', ['-o', 'BatchMode=yes', CONFIG.sshHost, 'bash', '-s'], {
			input: script,
			encoding: 'utf-8',
			stdio: ['pipe', 'inherit', 'inherit'],
		});
		if (r.status !== 0) process.exit(r.status ?? 1);
		console.log('\n远程部署完成.\n');
		return;
	}

	if (uploadOnly) {
		if (!existsSync(zipPath)) {
			console.error(`未找到 ${zipPath}`);
			process.exit(1);
		}
		run(`scp -o BatchMode=yes "${zipPath}" ${CONFIG.sshHost}:${CONFIG.remoteZipPath}`);
		console.log('\n已上传（未执行远程部署）.\n');
		return;
	}

	ensureProductionEnv(root);

	if (!noBuild) {
		const cmd = CONFIG.buildCommand.startsWith('bun') && !hasBun() ? 'npm run build' : CONFIG.buildCommand;
		run(cmd, { cwd: root });
	}
	if (existsSync(zipPath)) unlinkSync(zipPath);
	zipProject(root, zipPath);

	run(`scp -o BatchMode=yes "${zipPath}" ${CONFIG.sshHost}:${CONFIG.remoteZipPath}`);

	const script = remoteDeployScript(resetDb);
	const r = spawnSync('ssh', ['-o', 'BatchMode=yes', CONFIG.sshHost, 'bash', '-s'], {
		input: script,
		encoding: 'utf-8',
		stdio: ['pipe', 'inherit', 'inherit'],
	});
	if (r.status !== 0) process.exit(r.status ?? 1);

	console.log('\n全部完成.\n');
}

main();
