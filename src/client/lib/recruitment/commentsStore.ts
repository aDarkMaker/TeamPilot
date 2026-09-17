import { useCallback, useEffect, useRef, useState } from 'react';

import { deleteComment, fetchComments, patchComment, postComment, toggleCommentLike, type RecruitmentCommentDto } from './recruitmentClient';

export type CommentsByApplication = Record<string, RecruitmentCommentDto[]>;

/** Appends a freshly created comment to an application's thread */
const withAdded = (map: CommentsByApplication, id: string, row: RecruitmentCommentDto): CommentsByApplication => ({
	...map,
	[id]: [...(map[id] ?? []), row],
});

/** Replaces one comment in place, keeping the rest of the thread untouched */
const withReplaced = (map: CommentsByApplication, id: string, row: RecruitmentCommentDto): CommentsByApplication => ({
	...map,
	[id]: (map[id] ?? []).map((c) => (c.id === row.id ? row : c)),
});

const withRemoved = (map: CommentsByApplication, id: string, commentId: string): CommentsByApplication => ({
	...map,
	[id]: (map[id] ?? []).filter((c) => c.id !== commentId),
});

const withLikePatched = (
	map: CommentsByApplication,
	id: string,
	commentId: string,
	liked: boolean,
	likeCount: number
): CommentsByApplication => ({
	...map,
	[id]: (map[id] ?? []).map((c) => (c.id === commentId ? { ...c, likedByMe: liked, likeCount } : c)),
});

/**
 * Caches each applicant's comment thread and owns the mutations, so the page
 * no longer rebuilds the same nested map in five places.
 */
export function useApplicationComments(applicationId: string) {
	const [map, setMap] = useState<CommentsByApplication>({});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const mapRef = useRef(map);
	mapRef.current = map;

	useEffect(() => {
		if (!applicationId) return;
		let cancelled = false;
		(async () => {
			try {
				const list = await fetchComments(applicationId);
				if (!cancelled) setMap((prev) => ({ ...prev, [applicationId]: list }));
			} catch {
				// Keep whatever was cached so the panel still shows the thread it had.
				if (!cancelled) setMap((prev) => ({ ...prev, [applicationId]: prev[applicationId] ?? [] }));
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [applicationId]);

	const reset = useCallback(() => {
		setMap({});
		setError(null);
	}, []);

	/** Shared busy/error bookkeeping for every comment mutation */
	const run = useCallback(
		async (action: () => Promise<CommentsByApplication>, fallbackMessage: string) => {
			setError(null);
			setBusy(true);
			try {
				setMap(await action());
			} catch (e) {
				setError(e instanceof Error ? e.message : fallbackMessage);
			} finally {
				setBusy(false);
			}
		},
		[]
	);

	const add = useCallback(
		(bodyMarkdown: string) =>
			run(async () => withAdded(mapRef.current, applicationId, await postComment(applicationId, bodyMarkdown)), '发送失败'),
		[run, applicationId]
	);

	const edit = useCallback(
		(commentId: string, bodyMarkdown: string) =>
			run(
				async () => withReplaced(mapRef.current, applicationId, await patchComment(commentId, bodyMarkdown)),
				'保存失败'
			),
		[run, applicationId]
	);

	const remove = useCallback(
		(commentId: string) =>
			run(async () => {
				await deleteComment(commentId);
				return withRemoved(mapRef.current, applicationId, commentId);
			}, '删除失败'),
		[run, applicationId]
	);

	const like = useCallback(
		(commentId: string) =>
			run(async () => {
				const { liked, likeCount } = await toggleCommentLike(commentId);
				return withLikePatched(mapRef.current, applicationId, commentId, liked, likeCount);
			}, '操作失败'),
		[run, applicationId]
	);

	return {
		comments: (applicationId ? map[applicationId] : []) ?? [],
		busy,
		error,
		add,
		edit,
		remove,
		like,
		reset,
	};
}
