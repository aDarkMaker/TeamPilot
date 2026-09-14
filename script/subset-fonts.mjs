import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

const cacheDir = join(root, 'temp', 'fonts');
const zipPath = join(cacheDir, 'MiSans.zip');
const cjkFace = join(cacheDir, 'MiSansVF.ttf');
// Official Xiaomi release, ~217 MB. MiSans is free for commercial use but the
// licence requires attribution and forbids redistributing the font on its own.
const sourceUrl = 'https://hyperos.mi.com/font-download/MiSans.zip';

const outDir = join(root, 'src', 'client', 'assets', 'fonts', 'tangerine');
const outFile = join(outDir, 'misans-sc-var.woff2');
const glyphSource = join(root, 'src', 'client', 'assets', 'fonts', 'fonts.ttf');
const unicodeList = join(cacheDir, 'unicodes.txt');

// pyftsubset is the only supported subsetter here; brotli is required for woff2.
const features = 'kern,liga,calt,ccmp,locl,mark,mkmk,clig';

const EXTRACT_SCRIPT = `
import sys, zipfile

zip_path, dest = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path) as zf:
    target = next((n for n in zf.namelist() if n.lower().endswith('misansvf.ttf')), None)
    if target is None:
        raise SystemExit('MiSansVF.ttf not found in archive')
    with zf.open(target) as src, open(dest, 'wb') as out:
        out.write(src.read())
print(target)
`;

const DUMP_SCRIPT = `
import sys
from fontTools.ttLib import TTFont

EXTRA = (
    list(range(0x20, 0x7F))
    + [0xA0, 0xA9, 0xAE, 0xB0, 0xB7, 0xD7, 0xF7, 0x2013, 0x2014, 0x2018, 0x2019,
       0x201C, 0x201D, 0x2026, 0x2190, 0x2191, 0x2192, 0x2193, 0x25A0, 0x25CF]
    + list(range(0x3000, 0x3020))
    + list(range(0xFF01, 0xFF60))
)

def cmap(path):
    return set(TTFont(path, lazy=True).getBestCmap())

wanted = cmap(sys.argv[1]) | set(EXTRA)
available = cmap(sys.argv[2])
covered = sorted(wanted & available)
missing = sorted(wanted - available)

print(','.join('U+%04X' % cp for cp in covered))
print(len(covered), len(missing), file=sys.stderr)
if missing:
    print('missing sample:', ' '.join('U+%04X' % cp for cp in missing[:20]), file=sys.stderr)
`;

function requireTool(command, hint) {
	const probe = spawnSync('sh', ['-c', `command -v ${command}`], { encoding: 'utf8' });
	if (probe.status !== 0) {
		throw new Error(`${command} not found. ${hint}`);
	}
}

function run(command, args, label) {
	const result = spawnSync(command, args, { encoding: 'utf8' });
	if (result.status !== 0) {
		const detail = (result.stderr || result.stdout || '').trim();
		throw new Error(`${label} failed:\n${detail}`);
	}
	return result;
}

async function ensureSource() {
	if (existsSync(cjkFace)) return;

	mkdirSync(cacheDir, { recursive: true });
	if (!existsSync(zipPath)) {
		console.log(`Downloading ${sourceUrl} (this is a ~217 MB archive)`);
		run('curl', ['-sL', '--fail', '-o', zipPath, sourceUrl], 'MiSans download');
	}
	const extracted = run('python3', ['-c', EXTRACT_SCRIPT, zipPath, cjkFace], 'MiSans extraction');
	console.log(`Extracted ${extracted.stdout.trim()} → ${cjkFace}`);
}

async function buildUnicodeList() {
	// Reuse the glyph coverage of the shipped CJK face, intersected with what
	// MiSans actually provides, so dynamic console data never falls back to an
	// empty box while keeping the subset close to the previous payload size.
	const result = run('python3', ['-c', DUMP_SCRIPT, glyphSource, cjkFace], 'cmap dump');
	const [covered, missing] = result.stderr.trim().split('\n');
	const [coveredCount, missingCount] = covered.split(' ');

	if (Number(missingCount) > 0) {
		console.warn(`MiSans is missing ${missingCount} codepoint(s) from the reference cmap:`);
		console.warn(`  ${missing}`);
		for (const line of result.stderr.trim().split('\n').slice(2)) {
			console.warn(`  ${line}`);
		}
	}

	await writeFile(unicodeList, result.stdout.trim());
	return Number(coveredCount);
}

async function main() {
	requireTool('python3', 'Install Python 3 to read the reference cmap.');
	requireTool('pyftsubset', 'Install it with: pip install fonttools brotli');
	requireTool('curl', 'Install curl to fetch the upstream font.');

	mkdirSync(outDir, { recursive: true });
	await ensureSource();

	const codepoints = await buildUnicodeList();
	console.log(`Subsetting ${codepoints} covered codepoints from the reference cmap`);

	run(
		'pyftsubset',
		[
			cjkFace,
			`--unicodes-file=${unicodeList}`,
			`--layout-features=${features}`,
			'--flavor=woff2',
			'--no-hinting',
			'--desubroutinize',
			`--output-file=${outFile}`,
		],
		'pyftsubset'
	);

	const before = (await readFile(cjkFace)).length;
	const after = (await readFile(outFile)).length;
	const pct = ((1 - after / before) * 100).toFixed(1);
	console.log(`MiSansVF.ttf → misans-sc-var.woff2  ` + `${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024).toFixed(0)} KB  (-${pct}%)`);
}

main().catch((err) => {
	console.error('Font subsetting failed:', err.message);
	process.exit(1);
});
