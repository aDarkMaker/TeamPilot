import { AttachmentPanel } from './AttachmentPanel';
import { MarkdownBlock } from './MarkdownBlock';
import { TagsSection } from './TagsSection';

import { DEPARTMENT_LABELS, interviewSlotLabel } from '../../../lib/recruitment/departmentLabels';
import type { MeBrief } from '../../../lib/recruitment/recruitmentClient';
import type { NewcomerApplicationView } from '../../../types/recruitmentUi';

type Props = {
	application: NewcomerApplicationView;
	me: MeBrief | null;
	tagsBusy: boolean;
	tagsError: string | null;
	onTagAdd: (tag: string) => Promise<void>;
	onTagRemove: (tag: string) => Promise<void>;
};

export function NewcomerDetail({ application, me, tagsBusy, tagsError, onTagAdd, onTagRemove }: Props) {
	const dept = DEPARTMENT_LABELS[application.department];

	return (
		<div className="nc-detail">
			<header className="nc-detail-head">
				<div className="nc-detail-title-row">
					<h2 className="nc-detail-name">{application.fullName}</h2>
					<span className="nc-detail-dept">{dept}</span>
				</div>
				<time className="nc-detail-time" dateTime={application.createdAt}>
					提交 {formatCnTime(application.createdAt)}
				</time>
			</header>

			<section className="nc-detail-section nc-detail-section--meta">
				<h3 className="nc-section-title">基本信息</h3>
				<dl className="nc-meta-grid">
					<dt>手机</dt>
					<dd>{application.contact}</dd>
					<dt>QQ</dt>
					<dd>{application.qq}</dd>
					<dt>在校生</dt>
					<dd>{application.isStudent ? '是' : '否'}</dd>
					{application.isStudent ? (
						<>
							<dt>学院</dt>
							<dd>{application.schoolCollege ?? '—'}</dd>
							<dt>年级</dt>
							<dd>{application.grade ?? '—'}</dd>
						</>
					) : null}
					<dt>线下面试</dt>
					<dd>{application.wantsOfflineInterview ? interviewSlotLabel(application.offlineInterviewSlot) : '否'}</dd>
					<dt>线上面试</dt>
					<dd>{application.wantsOnlineInterview ? interviewSlotLabel(application.onlineInterviewSlot) : '否'}</dd>
				</dl>
			</section>

			<TagsSection
				tags={application.tags}
				busy={tagsBusy}
				error={tagsError}
				me={me}
				onAdd={onTagAdd}
				onRemove={onTagRemove}
			/>

			<div className="nc-detail-split">
				<section className="nc-detail-section nc-detail-section--grow">
					<h3 className="nc-section-title">个人简介</h3>
					<div className="nc-markdown-shell">
						<MarkdownBlock>{application.introMarkdown}</MarkdownBlock>
					</div>
					<h3 className="nc-section-title nc-section-title--spaced">个人作品</h3>
					<div className="nc-markdown-shell">
						<MarkdownBlock>{application.worksMarkdown}</MarkdownBlock>
					</div>
				</section>
				<section className="nc-detail-section nc-detail-section--attach">
					<h3 className="nc-section-title">附件预览</h3>
					<AttachmentPanel key={application.id} attachments={application.attachments} />
				</section>
			</div>
		</div>
	);
}

function formatCnTime(iso: string): string {
	try {
		const d = new Date(iso);
		return d.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
	} catch {
		return iso;
	}
}
