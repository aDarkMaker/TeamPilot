import { AttachmentPanel } from './AttachmentPanel';
import { MarkdownBlock } from './MarkdownBlock';
import { TagsSection } from './TagsSection';
import { RatingSection } from './RatingSection';

import { DEPARTMENT_LABELS } from '../../../lib/recruitment/departmentLabels';
import type { MeBrief } from '../../../lib/recruitment/recruitmentClient';
import type { NewcomerApplicationView } from '../../../types/recruitmentUi';
import { formatCstDateTime } from '../../../lib/timeCst';
import { useSearchHighlight } from '../../../lib/useSearchHighlight';
import { copyText } from '../../../lib/copyToClipboard';

type Props = {
	application: NewcomerApplicationView;
	me: MeBrief | null;
	tagsBusy: boolean;
	tagsError: string | null;
	onTagAdd: (tag: string) => Promise<void>;
	onTagRemove: (tag: string) => Promise<void>;
	deleteBusy: boolean;
	onApplicationDelete: () => Promise<void>;
	onCopyResult: (ok: boolean) => void;
	ratingAverage: number | null;
	ratingCount: number;
	myRating: number | null;
	ratingBusy?: boolean;
	onRate: (rating: number) => void;
};

export function NewcomerDetail({
	application,
	me,
	tagsBusy,
	tagsError,
	onTagAdd,
	onTagRemove,
	deleteBusy,
	onApplicationDelete,
	onCopyResult,
	ratingAverage,
	ratingCount,
	myRating,
	ratingBusy,
	onRate,
}: Props) {
	const { highlightText } = useSearchHighlight();
	const dept = DEPARTMENT_LABELS[application.department];
	const { introClean, offlineTime, onlineTime } = extractInterviewTimes(application.introMarkdown);
	const offlinePicked = application.wantsOfflineInterview ? (offlineTime ?? null) : null;
	const onlinePicked = application.wantsOnlineInterview ? (onlineTime ?? null) : null;

	return (
		<div className="nc-detail">
			<header className="nc-detail-head">
				<div className="nc-detail-title-row">
					<h2 className="nc-detail-name">{highlightText(application.fullName)}</h2>
					<span className="nc-detail-dept">{dept}</span>
					{me?.role === 'super_admin' ? (
						<button
							type="button"
							className="nc-btn nc-btn--text nc-btn--danger nc-detail-delete"
							disabled={deleteBusy}
							aria-label="删除报名"
							title="删除报名"
							onClick={() => void onApplicationDelete()}
						>
							×
						</button>
					) : null}
				</div>
				<time className="nc-detail-time" dateTime={application.createdAt}>
					提交 {formatCnTime(application.createdAt)}
				</time>
			</header>

			<section className="nc-detail-section nc-detail-section--meta">
				<h3 className="nc-section-title">基本信息</h3>
				<dl className="nc-meta-grid">
					<dt>手机</dt>
					<dd
						className="nc-meta-copy"
						title="点击复制"
						onClick={() => void copyText(application.contact).then(onCopyResult)}
					>
						{highlightText(application.contact)}
					</dd>
					<dt>QQ</dt>
					<dd
						className="nc-meta-copy"
						title="点击复制"
						onClick={() => void copyText(application.qq).then(onCopyResult)}
					>
						{highlightText(application.qq)}
					</dd>
					<dt>在校生</dt>
					<dd>{application.isStudent ? '是' : '否'}</dd>
					{application.isStudent ? (
						<>
							<dt>学院</dt>
							<dd>{highlightText(application.schoolCollege ?? '—')}</dd>
							<dt>年级</dt>
							<dd>{highlightText(application.grade ?? '—')}</dd>
						</>
					) : null}
					<dt>线下面试</dt>
					<dd>{application.wantsOfflineInterview ? '是' : '否'}</dd>
					{application.wantsOfflineInterview && offlinePicked ? (
						<>
							<dt>线下面试时间</dt>
							<dd>{offlinePicked}</dd>
						</>
					) : null}
					{application.wantsOfflineInterview ? null : (
						<>
							<dt>线上面试</dt>
							<dd>{application.wantsOnlineInterview ? '是' : '否'}</dd>
							{application.wantsOnlineInterview && onlinePicked ? (
								<>
									<dt>线上面试时间</dt>
									<dd>{onlinePicked}</dd>
								</>
							) : null}
						</>
					)}
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

			<RatingSection
				ratingAverage={ratingAverage}
				ratingCount={ratingCount}
				myRating={myRating}
				busy={ratingBusy}
				canRate={!!me}
				onRate={onRate}
			/>

			<div className="nc-detail-split">
				<section className="nc-detail-section nc-detail-section--grow">
					<h3 className="nc-section-title">个人简介</h3>
					<div className="nc-markdown-shell nc-markdown-shell--intro">
						<MarkdownBlock>{introClean}</MarkdownBlock>
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
	return formatCstDateTime(iso);
}

function extractInterviewTimes(introMarkdown: string): {
	introClean: string;
	offlineTime: string | null;
	onlineTime: string | null;
} {
	const raw = (introMarkdown ?? '').trim();
	if (!raw) return { introClean: '（无）', offlineTime: null, onlineTime: null };

	// 匿名报名表目前会把面试信息写在简介末尾，形如：
	// ---
	// 线下面试时间：xxx；线上面试时间：yyy
	let offlineTime: string | null = null;
	let onlineTime: string | null = null;

	const off = raw.match(/线下面试时间：([^\n；]+)\s*/);
	if (off?.[1]) offlineTime = off[1].trim() || null;
	const on = raw.match(/线上面试时间：([^\n；]+)\s*/);
	if (on?.[1]) onlineTime = on[1].trim() || null;

	// 删除包含面试时间的尾部片段（连同分割线）
	let introClean = raw;
	if (offlineTime || onlineTime) {
		introClean = introClean.replace(/\n*\s*---\s*\n[\s\S]*$/, '').trim();
	}
	if (!introClean) introClean = '（无）';
	return { introClean, offlineTime, onlineTime };
}
