import { useMemo, useState } from 'react';

import type { RecruitmentAttachment } from '../../../types/recruitmentUi';

type Props = {
	attachments: RecruitmentAttachment[];
};

export function AttachmentPanel({ attachments }: Props) {
	const [activeId, setActiveId] = useState(() => attachments[0]?.id ?? '');

	const active = useMemo(() => attachments.find((a) => a.id === activeId) ?? attachments[0] ?? null, [attachments, activeId]);

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
						onClick={() => setActiveId(a.id)}
					>
						<span className="nc-attach-tab-name">{displayBaseName(a.fileName)}</span>
						<span className="nc-attach-tab-badge">{kindLabel(a.kind)}</span>
					</button>
				))}
			</div>
			<div className="nc-attach-preview" role="tabpanel">
				{active && <AttachmentPreview attachment={active} />}
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
				<iframe title={fileName} className="nc-attach-frame" src={url} loading="lazy" />
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

	return (
		<div className="nc-attach-fallback">
			<p>该类型暂不支持内嵌预览。</p>
			<a className="nc-attach-download" href={url} download={fileName} target="_blank" rel="noreferrer">
				下载 {fileName}
			</a>
		</div>
	);
}
