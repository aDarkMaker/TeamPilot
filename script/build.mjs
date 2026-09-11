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
};

const REMOTE = {
	sharedNetwork: 'hxktoolbox_shared',
	bluePort: 8080,
	greenPort: 8090,
	siteConf: '/etc/nginx/sites-available/huaxiaoke.work',
	upstreamConf: '/etc/nginx/conf.d/hxktoolbox-upstream.conf',
};

// Local dry run: same script, isolated network and loopback ports.
const LOCAL = {
	sharedNetwork: 'hxktoolbox_shared_local',
	bluePort: 18080,
	greenPort: 18090,
	edgePort: 18000,
};

const HELP = `usage: bun run release [options]

options:
  --local                 local blue-green dry run (ports ${LOCAL.bluePort}/${LOCAL.greenPort}, server untouched)
  --no-cutover            build and start the idle colour only, traffic untouched
  --stop-previous         stop the previous stack after switching (off by default)
  --rollback              switch back to the previous release (no rebuild)
  --skip-build            reuse existing images
  --drain-seconds <n>     drain window before stopping the old stack, default 30
  -h, --help              show this help
`;

function run(cmd, opts = {}) {
	console.log(`\n→ ${cmd}\n`);
	execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

function parseArgs(argv) {
	const opts = {
		local: false,
		rollback: false,
		skipBuild: false,
		noCutover: false,
		stopPrevious: false,
		drainSeconds: 30,
		help: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--local') {
			opts.local = true;
		} else if (arg === '--rollback') {
			opts.rollback = true;
		} else if (arg === '--skip-build') {
			opts.skipBuild = true;
		} else if (arg === '--no-cutover') {
			opts.noCutover = true;
		} else if (arg === '--stop-previous') {
			opts.stopPrevious = true;
		} else if (arg === '--drain-seconds') {
			opts.drainSeconds = Number(argv[++i]);
		} else if (arg.startsWith('--drain-seconds=')) {
			opts.drainSeconds = Number(arg.split('=')[1]);
		} else if (arg === '--help' || arg === '-h') {
			opts.help = true;
		} else {
			console.error(`unknown option: ${arg}`);
			opts.help = true;
		}
	}
	if (!Number.isFinite(opts.drainSeconds) || opts.drainSeconds < 0) {
		console.error('--drain-seconds expects a non-negative number');
		opts.help = true;
	}
	if (opts.noCutover && opts.rollback) {
		console.error('--no-cutover and --rollback cannot be combined');
		opts.help = true;
	}
	return opts;
}

function makeReleaseTag() {
	let sha = 'nogit';
	try {
		sha = execSync('git rev-parse --short HEAD', { stdio: 'pipe' }).toString().trim();
	} catch {
		// not a git checkout, keep the fallback tag
	}
	const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
	return `${sha}-${stamp}`;
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
		'dist/*',
		'temp/*',
		'.deploy-state',
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
			throw new Error(`zip failed with code ${zr.status}`);
		}
		const st = statSync(zipPath);
		console.log(`\nzip ok: ${zipPath} (${(st.size / 1024 / 1024).toFixed(2)} MB)\n`);
	} finally {
		process.chdir(prev);
	}
}

function buildEnv(opts, tag, target) {
	const env = {
		DEPLOY_MODE: target.mode,
		PROJECT_DIR: target.projectDir,
		SHARED_NETWORK_NAME: target.sharedNetwork,
		BLUE_PORT: String(target.bluePort),
		GREEN_PORT: String(target.greenPort),
		RELEASE_TAG: tag,
		SKIP_BUILD: opts.skipBuild ? '1' : '0',
		STOP_PREVIOUS: opts.stopPrevious ? '1' : '0',
		NO_CUTOVER: opts.noCutover ? '1' : '0',
		ROLLBACK: opts.rollback ? '1' : '0',
		DRAIN_SECONDS: String(opts.drainSeconds),
	};
	if (target.edgePort) env.EDGE_PORT = String(target.edgePort);
	if (target.siteConf) {
		env.SITE_CONF = target.siteConf;
		env.UPSTREAM_CONF = target.upstreamConf;
	}
	return env;
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
	console.log('\nwarn: NODE_ENV in .env was not "production", fixed automatically\n');
	writeFileSync(envPath, fixed.join('\n'), 'utf-8');
}

// Uploads the source tree and lets the remote copy of script/deploy.sh do the
// blue-green work. The deploy script runs in a second ssh call so rsync never
// overwrites the script that is currently executing.
function remoteDeploy(rootDir, opts, tag) {
	const zipPath = join(rootDir, CONFIG.localZipName);
	if (existsSync(zipPath)) unlinkSync(zipPath);
	zipProject(rootDir, zipPath);
	run(`scp -o BatchMode=yes "${zipPath}" ${CONFIG.sshHost}:${CONFIG.remoteZipPath}`);

	const syncScript = `set -e
rm -rf /home/ubuntu/hxk_release_tmp
mkdir -p /home/ubuntu/hxk_release_tmp
unzip -oq ${CONFIG.remoteZipPath} -d /home/ubuntu/hxk_release_tmp
rsync -a \\
  --exclude '.env' \\
  --exclude '.env.production' \\
  --exclude 'data/' \\
  --exclude 'node_modules/' \\
  --exclude '.deploy-state' \\
  --exclude 'temp/' \\
  /home/ubuntu/hxk_release_tmp/ ${CONFIG.remoteProjectDir}/
rm -rf /home/ubuntu/hxk_release_tmp
echo "sync ok"`;

	const sync = spawnSync('ssh', ['-o', 'BatchMode=yes', CONFIG.sshHost, 'bash', '-s'], {
		input: syncScript,
		encoding: 'utf-8',
		stdio: ['pipe', 'inherit', 'inherit'],
	});
	if (sync.status !== 0) process.exit(sync.status ?? 1);

	const env = buildEnv(opts, tag, { mode: 'remote', projectDir: CONFIG.remoteProjectDir, ...REMOTE });
	const envPrefix = Object.entries(env)
		.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
		.join(' ');

	const deploy = spawnSync(
		'ssh',
		['-o', 'BatchMode=yes', CONFIG.sshHost, `cd ${CONFIG.remoteProjectDir} && env ${envPrefix} bash script/deploy.sh`],
		{ stdio: 'inherit' }
	);
	if (deploy.status !== 0) process.exit(deploy.status ?? 1);
}

function localDeploy(rootDir, opts, tag) {
	const env = buildEnv(opts, tag, { mode: 'local', projectDir: rootDir, ...LOCAL });
	const result = spawnSync('bash', ['script/deploy.sh'], {
		cwd: rootDir,
		stdio: 'inherit',
		env: { ...process.env, ...env },
	});
	if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
	const opts = parseArgs(process.argv.slice(2));
	if (opts.help) {
		console.log(HELP);
		return;
	}

	const root = resolve(__dirname, '..');
	const tag = makeReleaseTag();

	ensureProductionEnv(root);

	if (opts.local) {
		console.log(`\nlocal blue-green run: ${tag}\n`);
		localDeploy(root, opts, tag);
	} else {
		console.log(`\n${opts.rollback ? 'rollback' : 'release'}: ${tag}\n`);
		remoteDeploy(root, opts, tag);
	}

	console.log('\ndone.\n');
}

main();
