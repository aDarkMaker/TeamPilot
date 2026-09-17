import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { DashboardToast, useDashboardToast } from '@/components/dashboard/shell/DashboardToast';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { ApplicantListSidebar } from './ApplicantListSidebar';
import { CommentsPanel } from './CommentsPanel';
import { NewcomerDetail } from './NewcomerDetail';

import { deleteApplication, fetchMe, postTag, deleteTag, putApplicationRating, type MeBrief } from '@/lib/recruitment/recruitmentClient';
import { useApplicationComments } from '@/lib/recruitment/commentsStore';
import type { NewcomerApplicationView, RecruitmentDepartmentSlug } from '@/lib/recruitment/types';
import { recruitmentApplicationsStore } from '@/lib/recruitment/recruitmentApplicationsStore';
import { matchesName } from '@/lib/recruitment/nameMatch';

export default function NewcomersPage() {
	const toast = useDashboardToast();
	const [me, setMe] = useState<MeBrief | null>(null);

	const onCopyResult = useCallback(
		(ok: boolean) => {
			toast.show({ text: ok ? '已复制到剪贴板' : '复制失败', type: ok ? 'ok' : 'err' });
		},
		[toast]
	);

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

	const [tagsBusy, setTagsBusy] = useState(false);
	const [tagsError, setTagsError] = useState<string | null>(null);
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

	const comments = useApplicationComments(listSelectedId);

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

	const openDeleteConfirm = async () => {
		if (!selected || me?.role !== 'super_admin') return;
		setConfirmDeleteTarget({ id: selected.id, fullName: selected.fullName });
		setConfirmDeleteOpen(true);
	};

	const closeDeleteConfirm = () => {
		if (deleteBusy) return;
		setConfirmDeleteOpen(false);
		setConfirmDeleteTarget(null);
	};

	const performDeleteApplication = async () => {
		if (!confirmDeleteTarget) return;
		const targetId = confirmDeleteTarget.id;
		setDeleteBusy(true);
		setDeleteError(null);
		try {
			await deleteApplication(targetId);
			await recruitmentApplicationsStore.refresh();
			setSelectedId(recruitmentApplicationsStore.getSnapshot().items[0]?.id ?? '');
			comments.reset();
			setConfirmDeleteOpen(false);
			setConfirmDeleteTarget(null);
		} catch (e) {
			setDeleteError(e instanceof Error ? e.message : '删除失败');
		} finally {
			setDeleteBusy(false);
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
			<ConfirmModal
				open={confirmDeleteOpen && !!confirmDeleteTarget}
				title="确认删除报名"
				message={<>确定删除「{confirmDeleteTarget?.fullName}」的报名记录？该操作不可撤销。</>}
				confirmLabel="确定删除"
				busy={deleteBusy}
				onCancel={closeDeleteConfirm}
				onConfirm={() => void performDeleteApplication()}
			/>

			<ApplicantListSidebar
				applications={filteredApps}
				selectedId={listSelectedId}
				emptyHint={emptyListHint}
				deptFilter={deptFilter}
				onDeptFilterChange={setDeptFilter}
				nameQuery={nameQuery}
				onNameQueryChange={setNameQuery}
				attachOnly={attachOnly}
				onAttachOnlyChange={setAttachOnly}
				onSelect={setSelectedId}
			/>

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
						onApplicationDelete={openDeleteConfirm}
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
						comments={comments.comments}
						busy={comments.busy}
						error={comments.error}
						onAdd={comments.add}
						onEdit={comments.edit}
						onDelete={comments.remove}
						onLike={comments.like}
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
