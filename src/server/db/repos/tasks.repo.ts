import type { Database, SQLQueryBindings } from 'bun:sqlite';

import type { TaskSourceType, TaskStatus } from '../../types/task';
import type { TasksRepo } from '../contract';
import { mapTaskCard } from '../mappers';

export function createTasksRepo(sqlite: Database): TasksRepo {
	return {
		async listTaskCardsByUser(input) {
			const limit = Math.max(1, Math.min(100, Number(input.limit ?? 20)));
			const offset = Math.max(0, Number(input.offset ?? 0));

			const where: string[] = ['target_user_id = ?'];
			const bindings: SQLQueryBindings[] = [input.targetUserId];

			if (input.status) {
				where.push('status = ?');
				bindings.push(input.status);
			}

			const rows = sqlite
				.query(
					`SELECT
						id,
						target_user_id,
						actor_user_id,
						source_type,
						source_id,
						title,
						content,
						payload_json,
						status,
						decided_at,
						created_at,
						updated_at
					FROM task_cards
					WHERE ${where.join(' AND ')}
					ORDER BY created_at DESC
					LIMIT ? OFFSET ?`
				)
				.all(...bindings, limit, offset) as any[];

			return rows.map(mapTaskCard);
		},

		async countPendingTaskCardsByUser(targetUserId) {
			const row = sqlite.query(`SELECT COUNT(*) AS c FROM task_cards WHERE target_user_id = ? AND status = 'pending'`).get(targetUserId) as any;
			return Number(row?.c ?? 0);
		},

		async createOrReplaceTaskCard(input) {
			sqlite
				.query(
					`INSERT INTO task_cards (
						target_user_id, actor_user_id, source_type, source_id, title, content, payload_json, status
					) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
					ON CONFLICT(target_user_id, source_type, source_id) DO UPDATE SET
						actor_user_id = excluded.actor_user_id,
						title = excluded.title,
						content = excluded.content,
						payload_json = excluded.payload_json,
						updated_at = datetime('now')`
				)
				.run(input.targetUserId, input.actorUserId, input.sourceType, input.sourceId, input.title, input.content ?? null, input.payloadJson ?? null);

			const row = sqlite
				.query(
					`SELECT
						id,
						target_user_id,
						actor_user_id,
						source_type,
						source_id,
						title,
						content,
						payload_json,
						status,
						decided_at,
						created_at,
						updated_at
					FROM task_cards
					WHERE target_user_id = ? AND source_type = ? AND source_id = ?
					LIMIT 1`
				)
				.get(input.targetUserId, input.sourceType, input.sourceId) as any;

			return mapTaskCard(row);
		},

		async decideTaskCard(input) {
			const tx = sqlite.transaction((payload: typeof input) => {
				const row = sqlite.query(`SELECT id, target_user_id, status FROM task_cards WHERE id = ? LIMIT 1`).get(payload.taskId) as any;
				if (!row) throw new Error('TASK_NOT_FOUND');
				if (String(row.target_user_id) !== String(payload.targetUserId)) throw new Error('FORBIDDEN');

				sqlite
					.query(
						`UPDATE task_cards
						SET status = ?, decided_at = datetime('now'), updated_at = datetime('now')
						WHERE id = ?`
					)
					.run(payload.status, payload.taskId);

				const next = sqlite
					.query(
						`SELECT
							id,
							target_user_id,
							actor_user_id,
							source_type,
							source_id,
							title,
							content,
							payload_json,
							status,
							decided_at,
							created_at,
							updated_at
						FROM task_cards WHERE id = ? LIMIT 1`
					)
					.get(payload.taskId) as any;

				return next;
			});

			const row = tx(input);

			return {
				id: String(row.id),
				targetUserId: String(row.target_user_id),
				actorUserId: row.actor_user_id == null ? null : String(row.actor_user_id),
				sourceType: String(row.source_type) as TaskSourceType,
				sourceId: String(row.source_id),
				title: String(row.title),
				content: row.content ?? null,
				payloadJson: row.payload_json ?? null,
				status: String(row.status) as TaskStatus,
				decidedAt: row.decided_at ?? null,
				createdAt: String(row.created_at),
				updatedAt: String(row.updated_at),
			};
		},

		async listTaskCardsBySource(input) {
			const rows = sqlite
				.query(
					`SELECT
						id,
						target_user_id,
						actor_user_id,
						source_type,
						source_id,
						title,
						content,
						payload_json,
						status,
						decided_at,
						created_at,
						updated_at
					FROM task_cards
					WHERE source_type = ? AND source_id = ?
					ORDER BY created_at DESC`
				)
				.all(input.sourceType, input.sourceId) as any[];
			return rows.map(mapTaskCard);
		},

		async pruneTaskCardsBySourceTargets(input) {
			const keep = Array.from(new Set(input.keepTargetUserIds)).filter(Boolean);
			if (keep.length === 0) {
				sqlite.query(`DELETE FROM task_cards WHERE source_type = ? AND source_id = ?`).run(input.sourceType, input.sourceId);
				return;
			}
			const placeholders = keep.map(() => '?').join(', ');
			sqlite
				.query(
					`DELETE FROM task_cards
					 WHERE source_type = ? AND source_id = ?
					   AND target_user_id NOT IN (${placeholders})`
				)
				.run(input.sourceType, input.sourceId, ...keep);
		},

		async deleteTaskCardsBySource(input) {
			sqlite.query(`DELETE FROM task_cards WHERE source_type = ? AND source_id = ?`).run(input.sourceType, input.sourceId);
		},
	};
}
