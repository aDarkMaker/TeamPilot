import type { Database } from 'bun:sqlite';

import type { RecruitmentDepartment } from '../../types/recruitment';
import type { InterviewsRepo } from '../contract';
import { mapInterviewSlot, mapInterviewWindow, mapRecruitmentApplication } from '../mappers';

export function createInterviewsRepo(sqlite: Database): InterviewsRepo {
	return {
		async listInterviewWindows() {
			const rows = sqlite.query(`SELECT * FROM joinus_interview_windows ORDER BY date ASC, start_min ASC`).all();
			return rows.map(mapInterviewWindow);
		},

		async createInterviewWindowWithSlots(input) {
			const windowId = sqlite.transaction((p: { date: string; startMin: number; endMin: number }) => {
				const expected = Math.floor((p.endMin - p.startMin) / 15);
				if (expected <= 0) throw new Error('INVALID_WINDOW_RANGE');

				const r = sqlite
					.query(`INSERT INTO joinus_interview_windows (date, start_min, end_min) VALUES (?, ?, ?)`)
					.run(p.date, p.startMin, p.endMin);
				const id = String(r.lastInsertRowid);

				let inserted = 0;
				for (let m = p.startMin; m < p.endMin; m += 15) {
					inserted += sqlite
						.query(`INSERT OR IGNORE INTO joinus_interview_slots (window_id, date, start_min, end_min) VALUES (?, ?, ?, ?)`)
						.run(id, p.date, m, Math.min(m + 15, p.endMin)).changes;
				}
				if (inserted !== expected) throw new Error('WINDOW_CONFLICT');
				return id;
			})(input);
			const row = sqlite.query(`SELECT * FROM joinus_interview_windows WHERE id = ? LIMIT 1`).get(windowId);
			if (!row) throw new Error('WINDOW_CREATE_FAILED');
			return mapInterviewWindow(row);
		},

		async deleteInterviewWindow(windowId) {
			sqlite.transaction((id: string) => {
				const row = sqlite.query(`SELECT id FROM joinus_interview_windows WHERE id = ? LIMIT 1`).get(id);
				if (!row) throw new Error('WINDOW_NOT_FOUND');
				const booked = sqlite
					.query(
						`SELECT COUNT(*) AS c FROM recruitment_applications
						 WHERE offline_interview_slot_id IN (SELECT id FROM joinus_interview_slots WHERE window_id = ?)
							OR online_interview_slot_id IN (SELECT id FROM joinus_interview_slots WHERE window_id = ?)`
					)
					.get(id, id) as any;
				if (Number(booked?.c ?? 0) > 0) throw new Error('WINDOW_HAS_BOOKINGS');
				sqlite.query(`DELETE FROM joinus_interview_slots WHERE window_id = ?`).run(id);
				sqlite.query(`DELETE FROM joinus_interview_windows WHERE id = ?`).run(id);
			})(windowId);
		},

		async listInterviewSlotsWithBooked() {
			const rows = sqlite
				.query(
					`SELECT s.*,
						EXISTS(
							SELECT 1 FROM recruitment_applications a
							WHERE a.offline_interview_slot_id = s.id OR a.online_interview_slot_id = s.id
						) AS booked
					 FROM joinus_interview_slots s
					 ORDER BY s.date ASC, s.start_min ASC`
				)
				.all();
			return rows.map((r: any) => ({ ...mapInterviewSlot(r), booked: Boolean(r.booked) }));
		},

		async findInterviewSlotsByIds(ids) {
			if (ids.length === 0) return [];
			const placeholders = ids.map(() => '?').join(', ');
			const rows = sqlite.query(`SELECT * FROM joinus_interview_slots WHERE id IN (${placeholders})`).all(...ids);
			return rows.map(mapInterviewSlot);
		},

		async bookRecruitmentApplication(input) {
			const runBook = sqlite.transaction((args: {
				application: {
					submitterUserId: string;
					fullName: string;
					contact: string;
					qq: string;
					department: RecruitmentDepartment;
					departmentSortOrder: number;
					isStudent: boolean;
					schoolCollege: string | null;
					grade: string | null;
					wantsOfflineInterview: boolean;
					wantsOnlineInterview: boolean;
					introMarkdown: string;
					worksMarkdown: string;
					attachmentPath: string | null;
				};
				existingId: string | null;
				offlineSlotId: number | null;
				onlineSlotId: number | null;
			}) => {
				const offlineSlotId = args.offlineSlotId == null ? null : Number(args.offlineSlotId);
				const onlineSlotId = args.onlineSlotId == null ? null : Number(args.onlineSlotId);
				const app = args.application;
				const offlineSlotText = app.wantsOfflineInterview ? 'none' : null;
				const onlineSlotText = app.wantsOnlineInterview ? 'none' : null;

				if (offlineSlotId != null) {
					const row = sqlite.query(`SELECT id FROM joinus_interview_slots WHERE id = ? LIMIT 1`).get(offlineSlotId) as any;
					if (!row) throw new Error('OFFLINE_SLOT_NOT_FOUND');
					const taken = args.existingId
						? sqlite
								.query(
									`SELECT id FROM recruitment_applications
									 WHERE (offline_interview_slot_id = ? OR online_interview_slot_id = ?) AND id != ? LIMIT 1`
								)
								.get(offlineSlotId, offlineSlotId, args.existingId)
						: sqlite
								.query(
									`SELECT id FROM recruitment_applications
									 WHERE offline_interview_slot_id = ? OR online_interview_slot_id = ? LIMIT 1`
								)
								.get(offlineSlotId, offlineSlotId);
					if (taken) throw new Error('OFFLINE_SLOT_TAKEN');
				}

				if (onlineSlotId != null) {
					const row = sqlite.query(`SELECT id FROM joinus_interview_slots WHERE id = ? LIMIT 1`).get(onlineSlotId) as any;
					if (!row) throw new Error('ONLINE_SLOT_NOT_FOUND');
					const taken = args.existingId
						? sqlite
								.query(
									`SELECT id FROM recruitment_applications
									 WHERE (offline_interview_slot_id = ? OR online_interview_slot_id = ?) AND id != ? LIMIT 1`
								)
								.get(onlineSlotId, onlineSlotId, args.existingId)
						: sqlite
								.query(
									`SELECT id FROM recruitment_applications
									 WHERE offline_interview_slot_id = ? OR online_interview_slot_id = ? LIMIT 1`
								)
								.get(onlineSlotId, onlineSlotId);
					if (taken) throw new Error('ONLINE_SLOT_TAKEN');
				}

				const bindings: Array<string | number | null> = [
					app.submitterUserId,
					app.fullName,
					app.contact,
					app.qq,
					app.department,
					app.departmentSortOrder,
					app.isStudent ? 1 : 0,
					app.schoolCollege,
					app.grade,
					app.wantsOfflineInterview ? 1 : 0,
					offlineSlotText,
					offlineSlotId,
					app.wantsOnlineInterview ? 1 : 0,
					onlineSlotText,
					onlineSlotId,
					app.introMarkdown,
					app.worksMarkdown,
					app.attachmentPath,
				];

				let id: string;
				if (args.existingId) {
					sqlite
						.query(
							`UPDATE recruitment_applications SET
								submitter_user_id = ?, full_name = ?, contact = ?, qq = ?, department = ?, department_sort_order = ?,
								is_student = ?, school_college = ?, grade = ?,
								wants_offline_interview = ?, offline_interview_slot = ?, offline_interview_slot_id = ?,
								wants_online_interview = ?, online_interview_slot = ?, online_interview_slot_id = ?,
								intro_markdown = ?, works_markdown = ?, attachment_path = ?,
								updated_at = datetime('now')
							WHERE id = ?`
						)
						.run(...bindings, args.existingId);
					id = args.existingId;
				} else {
					const r = sqlite
						.query(
							`INSERT INTO recruitment_applications (
								submitter_user_id, full_name, contact, qq, department, department_sort_order,
								is_student, school_college, grade,
								wants_offline_interview, offline_interview_slot, offline_interview_slot_id,
								wants_online_interview, online_interview_slot, online_interview_slot_id,
								intro_markdown, works_markdown, attachment_path
							) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
						)
						.run(...bindings);
					id = String(r.lastInsertRowid);
				}

				const row = sqlite.query(`SELECT * FROM recruitment_applications WHERE id = ? LIMIT 1`).get(id);
				if (!row) throw new Error('RECRUITMENT_INSERT_FAILED');
				return mapRecruitmentApplication(row);
			});

			try {
				return runBook.immediate(input);
			} catch (e) {
				if (e instanceof Error && typeof (e as any).code === 'string' && (e as any).code.startsWith('SQLITE_CONSTRAINT')) {
					throw new Error(input.offlineSlotId != null && input.onlineSlotId == null ? 'OFFLINE_SLOT_TAKEN' : 'ONLINE_SLOT_TAKEN', {
						cause: e,
					});
				}
				throw e;
			}
		},
	};
}
