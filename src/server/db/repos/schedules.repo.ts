import type { Database } from 'bun:sqlite';

import type { SchedulesRepo } from '../contract';
import { mapSchedule, mapScheduleParticipant } from '../mappers';

export function createSchedulesRepo(sqlite: Database): SchedulesRepo {
	return {
		async createSchedule(input) {
			const tx = sqlite.transaction((payload: typeof input) => {
				const result = sqlite
					.query(
						`INSERT INTO schedules
							(title, description, location, is_all, year, month, day, start_at, end_at, duration_minutes, created_by)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.run(
						payload.title,
						payload.description,
						payload.location,
						payload.isAll ? 1 : 0,
						payload.year,
						payload.month,
						payload.day,
						payload.startAt,
						payload.endAt,
						payload.durationMinutes,
						payload.createdBy
					);

				const scheduleId = String(result.lastInsertRowid);

				if (!payload.isAll) {
					const uniq = Array.from(new Set(payload.participantIds));
					for (const userId of uniq) {
						sqlite.query(`INSERT OR IGNORE INTO schedule_participants (schedule_id, user_id) VALUES (?, ?)`).run(scheduleId, userId);
					}
				}

				const row = sqlite.query(`SELECT * FROM schedules WHERE id = ? LIMIT 1`).get(scheduleId);
				return mapSchedule(row);
			});

			return tx(input);
		},

		async updateSchedule(input, actor) {
			const tx = sqlite.transaction((payload: typeof input) => {
				const row = sqlite.query(`SELECT * FROM schedules WHERE id = ? LIMIT 1`).get(payload.id) as any;
				if (!row) throw new Error('SCHEDULE_NOT_FOUND');
				if (String(row.created_by) !== String(actor.id)) throw new Error('FORBIDDEN');

				sqlite
					.query(
						`UPDATE schedules
						 SET title = ?, description = ?, location = ?,
							 year = ?, month = ?, day = ?,
							 start_at = ?, end_at = ?, duration_minutes = ?,
							 updated_at = datetime('now')
						 WHERE id = ?`
					)
					.run(
						payload.title,
						payload.description,
						payload.location,
						payload.year,
						payload.month,
						payload.day,
						payload.startAt,
						payload.endAt,
						payload.durationMinutes,
						payload.id
					);

				const next = sqlite.query(`SELECT * FROM schedules WHERE id = ? LIMIT 1`).get(payload.id);
				return mapSchedule(next);
			});

			return tx(input);
		},

		async replaceScheduleParticipants(input) {
			const tx = sqlite.transaction((payload: typeof input) => {
				sqlite.query(`DELETE FROM schedule_participants WHERE schedule_id = ?`).run(payload.scheduleId);
				const uniq = Array.from(new Set(payload.participantIds));
				for (const userId of uniq) {
					sqlite.query(`INSERT OR IGNORE INTO schedule_participants (schedule_id, user_id) VALUES (?, ?)`).run(payload.scheduleId, userId);
				}
			});
			tx(input);
		},

		async listSchedulesByMonth(input) {
			const rows = sqlite.query(`SELECT * FROM schedules WHERE year = ? AND month = ? ORDER BY day ASC, start_at ASC`).all(input.year, input.month);
			return rows.map(mapSchedule);
		},
		async listSchedulesByDayForUser(input) {
			const rows = sqlite
				.query(
					`SELECT s.*
					 FROM schedules s
					 LEFT JOIN schedule_participants sp ON sp.schedule_id = s.id
					 WHERE s.year = ? AND s.month = ? AND s.day = ?
					   AND (s.is_all = 1 OR sp.user_id = ?)
					 ORDER BY s.start_at ASC`
				)
				.all(input.year, input.month, input.day, input.userId);
			return rows.map(mapSchedule);
		},

		async listSchedulesByDateRangeForUser(input) {
			const rows = sqlite
				.query(
					`SELECT DISTINCT s.*
					 FROM schedules s
					 LEFT JOIN schedule_participants sp ON sp.schedule_id = s.id
					 WHERE (s.is_all = 1 OR sp.user_id = ?)
					   AND printf('%04d-%02d-%02d', s.year, s.month, s.day) >= ?
					   AND printf('%04d-%02d-%02d', s.year, s.month, s.day) <= ?
					 ORDER BY s.year ASC, s.month ASC, s.day ASC, s.start_at ASC`
				)
				.all(input.userId, input.startDate, input.endDate);
			return rows.map(mapSchedule);
		},

		async listAllSchedulesFromDate(input) {
			const rows = sqlite
				.query(
					`SELECT s.*
					 FROM schedules s
					 WHERE s.is_all = 1
					   AND printf('%04d-%02d-%02d', s.year, s.month, s.day) >= ?
					 ORDER BY s.year ASC, s.month ASC, s.day ASC, s.start_at ASC`
				)
				.all(input.startDate);
			return rows.map(mapSchedule);
		},

		async listScheduleParticipants(scheduleId) {
			const rows = sqlite
				.query(
					`SELECT sp.schedule_id, sp.user_id, u.username, u.avatar_path
					FROM schedule_participants sp
					INNER JOIN users u ON u.id = sp.user_id
					WHERE sp.schedule_id = ?
					ORDER BY u.username ASC`
				)
				.all(scheduleId);
			return rows.map(mapScheduleParticipant);
		},

		async findScheduleById(scheduleId) {
			const row = sqlite.query(`SELECT * FROM schedules WHERE id = ? LIMIT 1`).get(scheduleId);
			return row ? mapSchedule(row) : null;
		},
		async deleteSchedule(scheduleId, actor) {
			const tx = sqlite.transaction((id: string) => {
				const row = sqlite.query(`SELECT * FROM schedules WHERE id = ? LIMIT 1`).get(id) as any;
				if (!row) throw new Error('SCHEDULE_NOT_FOUND');
				if (String(row.created_by) !== String(actor.id)) throw new Error('FORBIDDEN');
				sqlite.query(`DELETE FROM schedules WHERE id = ?`).run(id);
			});
			tx(scheduleId);
		},
	};
}
