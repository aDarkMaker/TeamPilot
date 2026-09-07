import { useEffect, useMemo, useRef, useState } from 'react';

import { PdfViewer } from './PdfViewer';
import type { RecruitmentAttachment } from '../../../types/recruitmentUi';

type Props = {
	attachments: RecruitmentAttachment[];
};

const SWAP_MS = 160;

export function AttachmentPanel({ attachments }: Props) {
	const [activeId, setActiveId] = useState(() => attachments[0]?.id ?? '');
	const [leaving, setLeaving] = useState(false);
	const swapTimer = useRef<number | undefined>(undefined);

	const active = useMemo(() => attachments.find((a) => a.id === activeId) ?? attachments[0] ?? null, [attachments, activeId]);

	useEffect(() => () => window.clearTimeout(swapTimer.current), []);

	const selectAttachment = (id: string) => {
		if (id === activeId || !attachments.some((a) => a.id === id)) return;
		window.clearTimeout(swapTimer.current);
		setLeaving(true);
		swapTimer.current = window.setTimeout(() => {
			setActiveId(id);
			setLeaving(false);
		}, SWAP_MS);
	};

	if (!attachments.length) {
		return (
			<div className="nc-attach nc-attach--empty">
				<p className="nc-attach-empty-hint">暂无附件</p>
			</div>
		);
	}

	return (
		<div className="nc-attach">
			<div className="nc-attach-toolbar" role="tablist" aria-label="附件">
				{attachments.map((a) => (
					<button
						key={a.id}
						type="button"
						role="tab"
						aria-selected={active?.id === a.id}
						title={a.fileName}
						className={`nc-attach-tab ${active?.id === a.id ? 'is-active' : ''}`}
						onClick={() => selectAttachment(a.id)}
					>
						<span className="nc-attach-tab-name">{displayBaseName(a.fileName)}</span>
						<span className="nc-attach-tab-badge">{kindLabel(a.kind)}</span>
					</button>
				))}
			</div>
			<div className="nc-attach-preview" role="tabpanel">
				<div key={active?.id} className={`nc-attach-preview-body ${leaving ? 'is-leaving' : ''}`}>
					{active && <AttachmentPreview attachment={active} />}
				</div>
			</div>
		</div>
	);
}

function kindLabel(kind: RecruitmentAttachment['kind']): string {
	switch (kind) {
		case 'pdf':
			return 'PDF';
		case 'image':
			return '图片';
		case 'video':
			return '视频';
		default:
			return '文件';
	}
}

function displayBaseName(fileName: string): string {
	const i = fileName.lastIndexOf('.');
	if (i <= 0 || i >= fileName.length - 1) return fileName;
	return fileName.slice(0, i);
}

function AttachmentPreview({ attachment }: { attachment: RecruitmentAttachment }) {
	const { kind, url, fileName } = attachment;

	if (kind === 'pdf') {
		return (
			<div className="nc-attach-frame-wrap">
				<PdfViewer url={url} fileName={fileName} />
				<a className="nc-attach-open" href={url} target="_blank" rel="noreferrer">
					新窗口打开
				</a>
			</div>
		);
	}

	if (kind === 'image') {
		return (
			<div className="nc-attach-image-wrap">
				<img className="nc-attach-image" src={url} alt={fileName} loading="lazy" decoding="async" />
				<a className="nc-attach-open" href={url} target="_blank" rel="noreferrer">
					原图
				</a>
			</div>
		);
	}

	if (kind === 'video') {
		return (
			<div className="nc-attach-video-wrap">
				<video key={url} className="nc-attach-video" src={url} controls playsInline preload="metadata" />
				<a className="nc-attach-open" href={url} target="_blank" rel="noreferrer">
					新窗口打开
				</a>
			</div>
		);
	}

	return (
		<div className="nc-attach-fallback">
			<p>该类型暂不支持内嵌预览。</p>
			<a className="nc-attach-download" href={url} download={fileName} target="_blank" rel="noreferrer">
				下载 {fileName}
			</a>
		</div>
	);
}
