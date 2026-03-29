import { useEffect, useMemo, useState } from 'react';

import { CommentsPanel } from './CommentsPanel';
import { DepartmentSelect } from './DepartmentSelect';
import { NewcomerDetail } from './NewcomerDetail';

import {
	deleteComment,
	deleteTag,
	fetchApplications,
	fetchComments,
	fetchMe,
	patchComment,
	postComment,
	postTag,
	toggleCommentLike,
	type MeBrief,
	type RecruitmentCommentDto,
} from '../../../lib/recruitment/recruitmentClient';
import type { NewcomerApplicationView, RecruitmentDepartmentSlug } from '../../../types/recruitmentUi';

export default function NewcomersPage() {
	const [me, setMe] = useState<MeBrief | null>(null);
	const [applications, setApplications] = useState<NewcomerApplicationView[]>([]);
	const [listLoading, setListLoading] = useState(true);
	const [listError, setListError] = useState<string | null>(null);
	const [deptFilter, setDeptFilter] = useState<RecruitmentDepartmentSlug | 'all'>('all');
	const [selectedId, setSelectedId] = useState('');
	const [commentsMap, setCommentsMap] = useState<Record<string, RecruitmentCommentDto[]>>({});

	const [tagsBusy, setTagsBusy] = useState(false);
	const [tagsError, setTagsError] = useState<string | null>(null);
	const [commentBusy, setCommentBusy] = useState(false);
	const [commentError, setCommentError] = useState<string | null>(null);

	useEffect(() => {
		void fetchMe().then(setMe);
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setListLoading(true);
			setListError(null);
			try {
				const list = await fetchApplications();
				if (cancelled) return;
				setApplications(list);
				setSelectedId((prev) => prev || list[0]?.id || '');
			} catch (e) {
				if (!cancelled) setListError(e instanceof Error ? e.message : '加载报名列表失败');
			} finally {
				if (!cancelled) setListLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const filteredApps = useMemo(() => {
		if (deptFilter === 'all') return applications;
		return applications.filter((a) => a.department === deptFilter);
	}, [applications, deptFilter]);

	/** 当前在「筛选后列表」中生效的报名 id（换组别时若原选中不在列表内则落到第一项） */
	const listSelectedId = useMemo(
		() => filteredApps.find((a) => a.id === selectedId)?.id ?? filteredApps[0]?.id ?? '',
		[filteredApps, selectedId],
	);

	const selected = useMemo(
		() => (listSelectedId ? applications.find((a) => a.id === listSelectedId) ?? null : null),
		[applications, listSelectedId],
	);

	useEffect(() => {
		if (!listSelectedId) return;
		let cancelled = false;
		(async () => {
			try {
				const list = await fetchComments(listSelectedId);
				if (!cancelled) setCommentsMap((p) => ({ ...p, [listSelectedId]: list }));
			} catch {
				if (!cancelled) setCommentsMap((p) => ({ ...p, [listSelectedId]: p[listSelectedId] ?? [] }));
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [listSelectedId]);

	const comments = listSelectedId ? (commentsMap[listSelectedId] ?? []) : [];

	const onTagAdd = async (tag: string) => {
		if (!selected) return;
		setTagsError(null);
		setTagsBusy(true);
		try {
			const next = await postTag(selected.id, tag);
			setApplications((prev) => prev.map((a) => (a.id === selected.id ? { ...a, tags: next } : a)));
		} catch (e) {
			setTagsError(e instanceof Error ? e.message : '标签添加失败');
		} finally {
			setTagsBusy(false);
		}
	};

	const onTagRemove = async (tag: string) => {
		if (!selected) return;
		setTagsError(null);
		setTagsBusy(true);
		try {
			await deleteTag(selected.id, tag);
			setApplications((prev) =>
				prev.map((a) => (a.id === selected.id ? { ...a, tags: a.tags.filter((t) => t !== tag) } : a)),
			);
		} catch (e) {
			setTagsError(e instanceof Error ? e.message : '标签删除失败');
		} finally {
			setTagsBusy(false);
		}
	};

	const onCommentAdd = async (bodyMarkdown: string) => {
		if (!selected || !me) return;
		setCommentError(null);
		setCommentBusy(true);
		try {
			const row = await postComment(selected.id, bodyMarkdown);
			setCommentsMap((p) => ({
				...p,
				[selected.id]: [...(p[selected.id] ?? []), row],
			}));
		} catch (e) {
			setCommentError(e instanceof Error ? e.message : '发送失败');
		} finally {
			setCommentBusy(false);
		}
	};

	const onCommentEdit = async (commentId: string, bodyMarkdown: string) => {
		if (!selected) return;
		setCommentError(null);
		setCommentBusy(true);
		try {
			const row = await patchComment(commentId, bodyMarkdown);
			setCommentsMap((p) => ({
				...p,
				[selected.id]: (p[selected.id] ?? []).map((c) => (c.id === commentId ? row : c)),
			}));
		} catch (e) {
			setCommentError(e instanceof Error ? e.message : '保存失败');
		} finally {
			setCommentBusy(false);
		}
	};

	const onCommentDelete = async (commentId: string) => {
		if (!selected) return;
		setCommentError(null);
		setCommentBusy(true);
		try {
			await deleteComment(commentId);
			setCommentsMap((p) => ({
				...p,
				[selected.id]: (p[selected.id] ?? []).filter((c) => c.id !== commentId),
			}));
		} catch (e) {
			setCommentError(e instanceof Error ? e.message : '删除失败');
		} finally {
			setCommentBusy(false);
		}
	};

	const onCommentLike = async (commentId: string) => {
		if (!selected || !me) return;
		setCommentError(null);
		setCommentBusy(true);
		try {
			const { liked, likeCount } = await toggleCommentLike(commentId);
			setCommentsMap((p) => ({
				...p,
				[selected.id]: (p[selected.id] ?? []).map((c) =>
					c.id === commentId ? { ...c, likedByMe: liked, likeCount } : c,
				),
			}));
		} catch (e) {
			setCommentError(e instanceof Error ? e.message : '操作失败');
		} finally {
			setCommentBusy(false);
		}
	};

	if (listLoading) {
		return (
			<div className="nc-page">
				<div className="nc-empty">加载中…</div>
			</div>
		);
	}

	if (listError) {
		return (
			<div className="nc-page">
				<div className="nc-empty">{listError}</div>
			</div>
		);
	}

	const emptyCenterHint =
		applications.length === 0 ? '暂无报名记录。' : '该组别暂无报名记录。';

	return (
		<div className="nc-page">
			<aside className="nc-list" aria-label="按组别筛选">
				<div className="nc-list-head">
					<span className="nc-list-title">报名列表</span>
					<span className="nc-list-count">{filteredApps.length}</span>
				</div>
				<div className="nc-dept-filter">
					<DepartmentSelect value={deptFilter} onChange={setDeptFilter} />
				</div>
				<ul className="nc-list-items">
					{filteredApps.map((app) => (
						<li key={app.id}>
							<button
								type="button"
								className={`nc-list-item ${app.id === listSelectedId ? 'is-active' : ''}`}
								onClick={() => setSelectedId(app.id)}
							>
								<span className="nc-list-item-name">{app.fullName}</span>
								<span className="nc-list-item-meta">{app.attachments.length} 个附件</span>
							</button>
						</li>
					))}
				</ul>
			</aside>

			<div className="nc-center">
				{selected ? (
					<NewcomerDetail
						application={selected}
						me={me}
						tagsBusy={tagsBusy}
						tagsError={tagsError}
						onTagAdd={onTagAdd}
						onTagRemove={onTagRemove}
					/>
				) : (
					<div className="nc-empty">{emptyCenterHint}</div>
				)}
			</div>

			<aside className="nc-comments-aside" aria-label="评论">
				{selected ? (
					<CommentsPanel
						me={me}
						comments={comments}
						busy={commentBusy}
						error={commentError}
						onAdd={onCommentAdd}
						onEdit={onCommentEdit}
						onDelete={onCommentDelete}
						onLike={onCommentLike}
					/>
				) : (
					<div className="nc-comments nc-comments--empty">
						<p className="nc-empty">选择一名报名者查看评论</p>
					</div>
				)}
			</aside>
		</div>
	);
}
