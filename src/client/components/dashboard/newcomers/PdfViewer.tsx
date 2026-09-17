import { useEffect, useRef, useState } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';

type Props = {
	url: string;
	fileName: string;
};

export function PdfViewer({ url }: Props) {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

	useEffect(() => {
		const host = scrollRef.current;
		if (!host) return;

		let disposed = false;
		let pdf: typeof import('pdfjs-dist') | null = null;
		let task: import('pdfjs-dist').PDFDocumentLoadingTask | null = null;
		let ro: ResizeObserver | null = null;
		let raf = 0;

		const renderPages = async (width: number) => {
			const doc = task?.promise ? await task.promise : null;
			if (!doc || disposed) return;
			const dpr = window.devicePixelRatio || 1;
			host.replaceChildren();
			for (let n = 1; n <= doc.numPages; n++) {
				if (disposed) return;
				let page: PDFPageProxy;
				try {
					page = await doc.getPage(n);
				} catch {
					continue;
				}
				const scale = width / page.getViewport({ scale: 1 }).width;
				const viewport = page.getViewport({ scale });
				const canvas = document.createElement('canvas');
				canvas.className = 'nc-pdf-canvas';
				canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
				canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
				canvas.style.width = `${Math.floor(viewport.width)}px`;
				canvas.style.height = `${Math.floor(viewport.height)}px`;
				const wrap = document.createElement('div');
				wrap.className = 'nc-pdf-page';
				wrap.appendChild(canvas);
				host.appendChild(wrap);
				if (disposed) return;
				try {
					await page.render({
						canvas,
						viewport,
						transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
					}).promise;
				} catch {
					// 单页渲染失败不影响后续页
				}
			}
		};

		const schedule = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const w = host.clientWidth;
				if (w > 0) void renderPages(w);
			});
		};

		(async () => {
			try {
				pdf = await import('pdfjs-dist');
				pdf.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
				task = pdf.getDocument({ url });
				await task.promise;
				if (disposed) return;
				setStatus('ready');
				schedule();
				ro = new ResizeObserver(schedule);
				ro.observe(host);
			} catch {
				if (!disposed) setStatus('error');
			}
		})();

		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			ro?.disconnect();
			host.replaceChildren();
			if (task) {
				void task.destroy().catch(() => undefined);
				task = null;
			}
		};
	}, [url]);

	// Hints stay under React; canvases go in the empty host so replaceChildren
	// cannot orphan a node React still thinks it owns.
	return (
		<div className="nc-attach-pdf">
			{status === 'loading' ? <p className="nc-pdf-hint">正在加载 PDF…</p> : null}
			{status === 'error' ? <p className="nc-pdf-hint is-error">PDF 加载失败，请尝试「新窗口打开」。</p> : null}
			<div ref={scrollRef} />
		</div>
	);
}
