import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchHighlight } from '../../../lib/useSearchHighlight';

import { DashboardToast, useDashboardToast } from '../DashboardToast';
import { CommentsPanel } from './CommentsPanel';
import { DepartmentSelect } from './DepartmentSelect';
import { NewcomerDetail } from './NewcomerDetail';
import { StarRatingDisplay, formatRatingAverage } from './StarRating';

import {
	deleteComment,
	deleteApplication,
	deleteTag,
	fetchComments,
	fetchMe,
	patchComment,
	postComment,
	postTag,
	putApplicationRating,
	toggleCommentLike,
	type MeBrief,
	type RecruitmentCommentDto,
} from '../../../lib/recruitment/recruitmentClient';
import type { NewcomerApplicationView, RecruitmentDepartmentSlug } from '../../../types/recruitmentUi';
import { recruitmentApplicationsStore } from '../../../lib/recruitment/recruitmentApplicationsStore';
import { matchesName } from '../../../lib/recruitment/nameMatch';

export default function NewcomersPage() {
	const toast = useDashboardToast();
	const [me, setMe] = useState<MeBrief | null>(null);

	const onCopyResult = useCallback(
		(ok: boolean) => {
			toast.show({ text: ok ? '已复制到剪贴板' : '复制失败', type: ok ? 'ok' : 'err' });
		},
		[toast]
	);
	const { highlightText } = useSearchHighlight();
	const appsState = useSyncExternalStore(
		recruitmentApplicationsStore.subscribe,
		recruitmentApplicationsStore.getSnapshot,
		recruitmentApplicationsStore.getServerSnapshot
	);
	const applications: NewcomerApplicationView[] = appsState.items;
	const listLoading = appsState.loading;
	const listError = appsState.error;
	const [deptFilter, setDeptFilter] = useState<RecruitmentDepartmentSlug | 'all'>('all');
	const [attachOnly, setAttachOnly] = useState(false);
	const [nameQuery, setNameQuery] = useState('');
	const [selectedId, setSelectedId] = useState('');
	const [commentsMap, setCommentsMap] = useState<Record<string, RecruitmentCommentDto[]>>({});

	const [tagsBusy, setTagsBusy] = useState(false);
	const [tagsError, setTagsError] = useState<string | null>(null);
	const [commentBusy, setCommentBusy] = useState(false);
	const [commentError, setCommentError] = useState<string | null>(null);
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{ id: string; fullName: string } | null>(null);
	const [ratingBusy, setRatingBusy] = useState(false);

	useEffect(() => {
		void fetchMe().then(setMe);
	}, []);

	useEffect(() => {
		void recruitmentApplicationsStore.refresh();
	}, []);

	useEffect(() => {
		if (selectedId) return;
		setSelectedId(applications[0]?.id ?? '');
	}, [applications, selectedId]);

	const filteredApps = useMemo(() => {
		const query = nameQuery.trim();
		return applications.filter((a) => {
			if (deptFilter !== 'all' && a.department !== deptFilter) return false;
			if (attachOnly && a.attachments.length === 0) return false;
			if (query && !matchesName(a.fullName, query)) return false;
			return true;
		});
	}, [applications, deptFilter, attachOnly, nameQuery]);

	const listSelectedId = useMemo(() => filteredApps.find((a) => a.id === selectedId)?.id ?? filteredApps[0]?.id ?? '', [filteredApps, selectedId]);

	const selected = useMemo(
		() => (listSelectedId ? (applications.find((a) => a.id === listSelectedId) ?? null) : null),
		[applications, listSelectedId]
	);

	const onRate = useCallback(
		async (rating: number) => {
			if (!selected || !me) return;
			setRatingBusy(true);
			try {
				const data = await putApplicationRating(selected.id, rating);
				recruitmentApplicationsStore.patchApplicationRating(selected.id, {
					ratingAverage: data.ratingAverage,
					ratingCount: data.ratingCount,
					myRating: data.myRating,
				});
			} catch (e) {
				toast.show({ text: e instanceof Error ? e.message : '评分保存失败', type: 'err' });
			} finally {
				setRatingBusy(false);
			}
		},
		[selected, me, toast]
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
			await postTag(selected.id, tag);
			void recruitmentApplicationsStore.refresh();
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
			void recruitmentApplicationsStore.refresh();
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
				[selected.id]: (p[selected.id] ?? []).map((c) => (c.id === commentId ? { ...c, likedByMe: liked, likeCount } : c)),
			}));
		} catch (e) {
			setCommentError(e instanceof Error ? e.message : '操作失败');
		} finally {
			setCommentBusy(false);
		}
	};

	const onApplicationDelete = async () => {
		if (!selected || !me) return;
		if (me.role !== 'super_admin') return;

		setConfirmDeleteTarget({ id: selected.id, fullName: selected.fullName });
		setConfirmDeleteOpen(true);
	};

	const performDeleteApplication = async () => {
		if (!confirmDeleteTarget) return;
		setConfirmDeleteOpen(false);

		setDeleteBusy(true);
		setDeleteError(null);
		try {
			await deleteApplication(confirmDeleteTarget.id);
			await recruitmentApplicationsStore.refresh();
			setSelectedId(recruitmentApplicationsStore.getSnapshot().items[0]?.id ?? '');
			setCommentsMap({});
		} catch (e) {
			setDeleteError(e instanceof Error ? e.message : '删除失败');
		} finally {
			setDeleteBusy(false);
			setConfirmDeleteTarget(null);
		}
	};

	if (listLoading && applications.length === 0) {
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

	const emptyCenterHint = applications.length === 0 ? '暂无报名记录。' : '没有符合筛选条件的报名记录。';
	const emptyListHint = applications.length === 0 ? '暂无报名记录。' : '没有符合筛选条件的记录。';

	return (
		<div className="nc-page">
			<DashboardToast toast={toast.toast} />
			<div className="tc-page-head nc-page-head">
				<div className="tc-page-head__text">
					<span className="tc-eyebrow">招新</span>
					<h1 className="tc-page-title">新人详情</h1>
				</div>
			</div>
			{confirmDeleteOpen && confirmDeleteTarget ? (
				<div
					className="users-admin-modal"
					role="dialog"
					aria-modal="true"
					onClick={() => {
						if (!deleteBusy) {
							setConfirmDeleteOpen(false);
							setConfirmDeleteTarget(null);
						}
					}}
				>
					<div className="users-admin-modal-card" onClick={(e) => e.stopPropagation()}>
						<div className="users-admin-modal-head">
							<div className="users-admin-modal-title">确认删除报名</div>
							<div className="users-admin-modal-actions">
								<button
									type="button"
									className="users-admin-modal-close"
									disabled={deleteBusy}
									onClick={() => {
										if (!deleteBusy) {
											setConfirmDeleteOpen(false);
											setConfirmDeleteTarget(null);
										}
									}}
									aria-label="关闭"
								>
									×
								</button>
							</div>
						</div>
						<div className="users-admin-msg err" style={{ marginBottom: 12 }}>
							确定删除「{confirmDeleteTarget.fullName}」的报名记录？该操作不可撤销。
						</div>
						<div className="users-admin-modal-actions users-admin-modal-actions--end">
							<button
								type="button"
								className="users-admin-btn"
								disabled={deleteBusy}
								onClick={() => {
									if (!deleteBusy) {
										setConfirmDeleteOpen(false);
										setConfirmDeleteTarget(null);
									}
								}}
							>
								取消
							</button>
							<button
								type="button"
								className="users-admin-btn danger"
								disabled={deleteBusy}
								onClick={() => void performDeleteApplication()}
								style={{ marginLeft: 10 }}
							>
								确定删除
							</button>
						</div>
					</div>
				</div>
			) : null}

			<aside className="nc-list" aria-label="按组别筛选">
				<div className="nc-list-head">
					<span className="nc-list-title">报名列表</span>
					<span className="nc-list-count">{filteredApps.length}</span>
				</div>
				<div className="nc-list-tools">
					<div className="nc-filter-row">
						<DepartmentSelect value={deptFilter} onChange={setDeptFilter} />
						<div className="nc-coolfield">
							<label className="nc-coolfield-label" htmlFor="nc-name-search">
								姓名
							</label>
							<input
								id="nc-name-search"
								type="search"
								className="nc-coolfield-control nc-coolfield-input"
								value={nameQuery}
								onChange={(e) => setNameQuery(e.target.value)}
								placeholder="搜索姓名"
							/>
						</div>
					</div>
					<div className="nc-attach-check">
						<input
							type="checkbox"
							id="nc-attach-only"
							className="nc-attach-check-input"
							checked={attachOnly}
							onChange={(e) => setAttachOnly(e.target.checked)}
						/>
						<label className="nc-attach-check-label" htmlFor="nc-attach-only">
							<svg className="nc-attach-check-svg" viewBox="0 0 95 95" focusable="false" aria-hidden>
								<rect className="nc-attach-check-box" x={30} y={20} width={50} height={50} fill="none" />
								<g transform="translate(0,-952.36222)">
									<path
										className="nc-attach-check-path"
										d="m 56,963 c -102,122 6,9 7,9 17,-5 -66,69 -38,52 122,-77 -7,14 18,4 29,-11 45,-43 23,-4"
										fill="none"
									/>
								</g>
							</svg>
							<span>仅看有附件</span>
						</label>
					</div>
				</div>
				<ul className="nc-list-items">
					{filteredApps.length === 0 ? <li className="nc-list-empty">{emptyListHint}</li> : null}
					{filteredApps.map((app) => (
						<li key={app.id}>
							<button type="button" className={`nc-list-item ${app.id === listSelectedId ? 'is-active' : ''}`} onClick={() => setSelectedId(app.id)}>
								<span className="nc-list-item-name">{highlightText(app.fullName) as React.ReactNode}</span>
								{app.ratingCount > 0 ? (
									<span className="nc-list-item-rating">
										<StarRatingDisplay value={app.ratingAverage} size="sm" />
										<span className="nc-list-item-rating-value">{formatRatingAverage(app.ratingAverage)}</span>
									</span>
								) : null}
								<span className="nc-list-item-meta">{app.attachments.length} 个附件</span>
							</button>
						</li>
					))}
				</ul>
			</aside>

			<div className="nc-center">
				{deleteError ? <div className="nc-inline-err">{deleteError}</div> : null}
				{selected ? (
					<NewcomerDetail
						application={selected}
						me={me}
						tagsBusy={tagsBusy}
						tagsError={tagsError}
						onTagAdd={onTagAdd}
						onTagRemove={onTagRemove}
						deleteBusy={deleteBusy}
						onApplicationDelete={onApplicationDelete}
						onCopyResult={onCopyResult}
						ratingAverage={selected.ratingAverage}
						ratingCount={selected.ratingCount}
						myRating={selected.myRating}
						ratingBusy={ratingBusy}
						onRate={onRate}
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
