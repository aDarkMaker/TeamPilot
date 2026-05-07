import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fontsDir = join(__dirname, '..', 'src', 'client', 'assets', 'fonts');

async function main() {
	const files = await readdir(fontsDir);
	const ttfFiles = files.filter((f) => extname(f).toLowerCase() === '.ttf');

	if (ttfFiles.length === 0) {
		console.log('No .ttf files found in', fontsDir);
		return;
	}

	// Dynamically import wawoff2
	const { compress } = await import('wawoff2');

	for (const file of ttfFiles) {
		const ttfPath = join(fontsDir, file);
		const woff2Path = ttfPath.replace(/\.ttf$/i, '.woff2');

		const ttfBuf = await readFile(ttfPath);
		const woff2Buf = await compress(ttfBuf);

		await writeFile(woff2Path, woff2Buf);

		const pct = ((1 - woff2Buf.length / ttfBuf.length) * 100).toFixed(1);
		console.log(
			`${file} → ${file.replace(/\.ttf$/i, '.woff2')}  ` +
			`${(ttfBuf.length / 1024).toFixed(0)} KB → ${(woff2Buf.length / 1024).toFixed(0)} KB  (-${pct}%)`
		);
	}
}

main().catch((err) => {
	console.error('Font compression failed:', err);
	process.exit(1);
});