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
		let gen = 0;
		let lastWidth = 0;
		const renders = new Set<import('pdfjs-dist').RenderTask>();

		const cancelPending = () => {
			for (const pending of renders) {
				try {
					pending.cancel();
				} catch {
					// 已结束的任务取消会抛错，忽略
				}
			}
			renders.clear();
		};

		const renderPages = async (width: number) => {
			const myGen = ++gen;
			cancelPending();

			const doc = task?.promise ? await task.promise : null;
			if (!doc || disposed || myGen !== gen) return;
			const dpr = window.devicePixelRatio || 1;
			const fragment = document.createDocumentFragment();
			for (let n = 1; n <= doc.numPages; n++) {
				if (disposed || myGen !== gen) return;
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
				fragment.appendChild(wrap);
				const renderTask = page.render({
					canvas,
					viewport,
					transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
				});
				renders.add(renderTask);
				try {
					await renderTask.promise;
				} catch {
					// 单页渲染失败或被取消都不影响后续页
				} finally {
					renders.delete(renderTask);
				}
			}
			if (disposed || myGen !== gen) return;
			host.replaceChildren(fragment);
		};

		// 只按宽度重绘：追加页面只改变高度，观察增高中的 host 会让 Firefox 反复重绘。
		const schedule = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const w = Math.floor(host.clientWidth);
				if (w <= 0 || w === lastWidth) return;
				lastWidth = w;
				void renderPages(w);
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
				ro.observe(host.parentElement ?? host);
			} catch {
				if (!disposed) setStatus('error');
			}
		})();

		return () => {
			disposed = true;
			gen++;
			cancelAnimationFrame(raf);
			ro?.disconnect();
			cancelPending();
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
