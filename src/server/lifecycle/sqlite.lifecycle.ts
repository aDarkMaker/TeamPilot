import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Database } from 'bun:sqlite';
import { config } from '../config';

let sqlite: Database | null = null;

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertIdent(name: string, label: string): void {
	if (!IDENT.test(name)) throw new Error(`Invalid ${label}: ${name}`);
}

function listTableColumnNames(db: Database, table: string): string[] {
	assertIdent(table, 'table');
	return db
		.query(`PRAGMA table_info(${table})`)
		.all()
		.map((r: any) => String(r.name));
}

export function ensureColumn(db: Database, table: string, column: string, typeSql: string): void {
	assertIdent(table, 'table');
	assertIdent(column, 'column');
	if (listTableColumnNames(db, table).includes(column)) return;
	db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`);
}

function getUserVersion(db: Database): number {
	const row = db.query('PRAGMA user_version').get() as Record<string, unknown> | undefined;
	if (!row) return 0;
	const raw = row.user_version;
	const n = typeof raw === 'number' ? raw : Number(raw);
	return Number.isFinite(n) ? n : 0;
}

const EXPECTED_MIGRATION_STEPS = 4;

const MIGRATION_STEPS: Array<(db: Database) => void> = [
	(_db) => {},
	(db) => {
		if (!listTableColumnNames(db, 'users').includes('bilibili_refresh_token')) {
			db.run(`ALTER TABLE users ADD COLUMN bilibili_refresh_token TEXT`);
		}
	},
	(db) => {
		if (!listTableColumnNames(db, 'users').includes('bili_uid')) {
			db.run(`ALTER TABLE users ADD COLUMN bili_uid TEXT`);
		}
	},
	(db) => {
		if (!listTableColumnNames(db, 'users').includes('bili_cookie')) {
			db.run(`ALTER TABLE users ADD COLUMN bili_cookie TEXT`);
		}
	},
];

function runMigrationSteps(db: Database): void {
	if (MIGRATION_STEPS.length !== EXPECTED_MIGRATION_STEPS) {
		throw new Error(`[sqlite] MIGRATION_STEPS.length (${MIGRATION_STEPS.length}) !== EXPECTED_MIGRATION_STEPS (${EXPECTED_MIGRATION_STEPS})`);
	}
	let v = getUserVersion(db);
	while (v < MIGRATION_STEPS.length) {
		const step = MIGRATION_STEPS[v];
		if (step) step(db);
		v += 1;
		db.run(`PRAGMA user_version = ${v}`);
	}
}

function ensureUserColumn(db: Database, column: string, type: string): void {
	ensureColumn(db, 'users', column, type);
}

function ensureBirthdayColumn(db: Database): void {
	ensureUserColumn(db, 'birthday_month', 'INTEGER');
	ensureUserColumn(db, 'birthday_day', 'INTEGER');
}

function ensureHomeAnnouncementColumn(db: Database, column: string, type: string): void {
	ensureColumn(db, 'home_announcements', column, type);
}

function ensureScheduleColumn(db: Database, column: string, type: string): void {
	ensureColumn(db, 'schedules', column, type);
}

function initSchema(db: Database): void {
	db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'super_admin')),
        status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
        nickname TEXT,
        signature TEXT,
        qq TEXT,
        avatar_path TEXT,
        profile_bg_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    `);

	ensureUserColumn(db, 'avatar_path', 'TEXT');
	ensureUserColumn(db, 'profile_bg_path', 'TEXT');
	ensureUserColumn(db, 'nickname', 'TEXT');
	ensureUserColumn(db, 'signature', 'TEXT');
	ensureUserColumn(db, 'qq', 'TEXT');
	ensureBirthdayColumn(db);

	db.run(`
    CREATE TABLE IF NOT EXISTS account_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by TEXT NULL,
        reviewed_at TEXT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    `);

	db.run(`
	CREATE TABLE IF NOT EXISTS schedules (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		description TEXT,
		location TEXT,
		is_all INTEGER NOT NULL DEFAULT 0 CHECK (is_all IN (0, 1)),
		year INTEGER NOT NULL,
		month INTEGER NOT NULL,
		day INTEGER NOT NULL,
		start_at TEXT NOT NULL,
		end_at TEXT NOT NULL,
		duration_minutes INTEGER NOT NULL,
		created_by INTEGER NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY(created_by) REFERENCES users(id)
	);
		`);
	ensureScheduleColumn(db, 'is_all', `INTEGER NOT NULL DEFAULT 0 CHECK (is_all IN (0, 1))`);

	try {
		db.run(`
			UPDATE schedules
			   SET is_all = 1
			 WHERE is_all = 0
			   AND (SELECT COUNT(*) FROM schedule_participants sp WHERE sp.schedule_id = schedules.id) >= (
					SELECT COUNT(*)
					  FROM users u
					 WHERE u.status = 'active'
					   AND u.username != 'joinus-public'
					   AND u.created_at <= schedules.created_at
			   )
		`);
	} catch {
		// ignore: best-effort backfill
	}

	db.run(`
	CREATE TABLE IF NOT EXISTS schedule_participants (
		schedule_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		PRIMARY KEY (schedule_id, user_id),
		FOREIGN KEY(schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
		`);

	db.run(`CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status)`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_applications_status ON account_applications(status)`);

	db.run(`CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(year, month, day)`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_schedule_participants_user ON schedule_participants(user_id)`);

	db.run(`
	CREATE TABLE IF NOT EXISTS home_announcements (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		content_markdown TEXT NOT NULL,
		is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
		created_by INTEGER NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY(created_by) REFERENCES users(id)
	);
	`);
	ensureHomeAnnouncementColumn(db, 'is_pinned', 'INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1))');
	db.run(`CREATE INDEX IF NOT EXISTS idx_home_announcements_created_at ON home_announcements(created_at DESC)`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_home_announcements_pinned_created ON home_announcements(is_pinned DESC, created_at DESC)`);

	db.run(`
		CREATE TABLE IF NOT EXISTS birthday_wishes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			recipient_user_id INTEGER NOT NULL,
			author_user_id INTEGER NOT NULL,
			message TEXT NOT NULL,
			wish_date TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY(recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY(author_user_id) REFERENCES users(id) ON DELETE CASCADE
	);
	`);

	db.run(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_birthday_wishes_unique
		ON birthday_wishes(recipient_user_id, author_user_id, wish_date);
	`);

	db.run(`
		CREATE INDEX IF NOT EXISTS idx_birthday_wishes_recipient_date
		ON birthday_wishes(recipient_user_id, wish_date, created_at);
	`);

	db.run(`
	CREATE TABLE IF NOT EXISTS task_cards (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		target_user_id INTEGER NOT NULL,
		actor_user_id INTEGER,
		source_type TEXT NOT NULL,
		source_id TEXT NOT NULL,
		title TEXT NOT NULL,
		content TEXT,
		payload_json TEXT,
		status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'leave')),
		decided_at TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
	);	
	`);

	db.run(`
	CREATE UNIQUE INDEX IF NOT EXISTS idx_task_cards_target_source
	ON task_cards(target_user_id, source_type, source_id);	
	`);

	db.run(`
		CREATE INDEX IF NOT EXISTS idx_task_cards_target_status_time
		ON task_cards(target_user_id, status, created_at DESC);
	`);

	db.run(`
	CREATE TABLE IF NOT EXISTS recruitment_applications (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		submitter_user_id INTEGER NOT NULL,
		full_name TEXT NOT NULL,
		contact TEXT NOT NULL,
		qq TEXT NOT NULL,
		department TEXT NOT NULL,
		department_sort_order INTEGER NOT NULL,
		is_student INTEGER NOT NULL CHECK (is_student IN (0, 1)),
		school_college TEXT,
		grade TEXT,
		wants_offline_interview INTEGER NOT NULL CHECK (wants_offline_interview IN (0, 1)),
		offline_interview_slot TEXT,
		wants_online_interview INTEGER NOT NULL CHECK (wants_online_interview IN (0, 1)),
		online_interview_slot TEXT,
		intro_markdown TEXT NOT NULL,
		works_markdown TEXT NOT NULL,
		attachment_path TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY(submitter_user_id) REFERENCES users(id)
	);
	`);

	db.run(`
	CREATE TABLE IF NOT EXISTS recruitment_comments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		application_id INTEGER NOT NULL,
		author_id INTEGER NOT NULL,
		body_markdown TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY(application_id) REFERENCES recruitment_applications(id) ON DELETE CASCADE,
		FOREIGN KEY(author_id) REFERENCES users(id)
	);
	`);

	db.run(`
	CREATE TABLE IF NOT EXISTS recruitment_comment_likes (
		comment_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		PRIMARY KEY (comment_id, user_id),
		FOREIGN KEY(comment_id) REFERENCES recruitment_comments(id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`);

	db.run(`
	CREATE TABLE IF NOT EXISTS recruitment_application_tags (
		application_id INTEGER NOT NULL,
		tag TEXT NOT NULL,
		created_by INTEGER NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		PRIMARY KEY (application_id, tag),
		FOREIGN KEY(application_id) REFERENCES recruitment_applications(id) ON DELETE CASCADE,
		FOREIGN KEY(created_by) REFERENCES users(id)
	);
	`);

	db.run(`
	CREATE TABLE IF NOT EXISTS recruitment_application_ratings (
		application_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		rating REAL NOT NULL CHECK (rating >= 0.5 AND rating <= 5),
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now')),
		PRIMARY KEY (application_id, user_id),
		FOREIGN KEY(application_id) REFERENCES recruitment_applications(id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	);
	`);

	db.run(`CREATE INDEX IF NOT EXISTS idx_recruitment_apps_dept_time ON recruitment_applications(department_sort_order, created_at)`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_recruitment_comments_app ON recruitment_comments(application_id, created_at)`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_recruitment_ratings_app ON recruitment_application_ratings(application_id)`);

	ensureRecruitmentContactUniqueIndex(db);

	runMigrationSteps(db);

	cleanupExpiredData(db);
}

function cleanupExpiredData(db: Database): void {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 14);
	const cutoffY = cutoff.getFullYear();
	const cutoffM = cutoff.getMonth() + 1;
	const cutoffD = cutoff.getDate();

	try {
		let scheduleCount = 0;
		let scheduleTaskCount = 0;
		let processedTaskCount = 0;
		let wishCount = 0;

		db.transaction(() => {
			const expiredSchedules = db
				.query(`SELECT id FROM schedules WHERE year < ?1 OR (year = ?1 AND month < ?2) OR (year = ?1 AND month = ?2 AND day < ?3)`)
				.all(cutoffY, cutoffM, cutoffD) as { id: number }[];

			scheduleCount = expiredSchedules.length;
			for (const s of expiredSchedules) {
				const r = db.run(`DELETE FROM task_cards WHERE source_type = 'schedule_at' AND source_id = ?`, [String(s.id)]);
				scheduleTaskCount += (r as any).changes;
				db.run(`DELETE FROM schedule_participants WHERE schedule_id = ?`, [s.id]);
				db.run(`DELETE FROM schedules WHERE id = ?`, [s.id]);
			}

			const doneTasks = db.query(`SELECT id, payload_json FROM task_cards WHERE status IN ('accepted', 'leave')`).all() as {
				id: number;
				payload_json: string | null;
			}[];

			for (const t of doneTasks) {
				if (!t.payload_json) continue;
				try {
					const p = JSON.parse(t.payload_json);
					if (
						p.year &&
						p.month &&
						p.day &&
						(p.year < cutoffY || (p.year === cutoffY && p.month < cutoffM) || (p.year === cutoffY && p.month === cutoffM && p.day < cutoffD))
					) {
						const r = db.run(`DELETE FROM task_cards WHERE id = ?`, [t.id]);
						processedTaskCount += (r as any).changes;
					}
				} catch {
					// ignore unparseable payload
				}
			}

			const allWishes = db.query(`SELECT id, wish_date FROM birthday_wishes`).all() as { id: number; wish_date: string }[];

			for (const w of allWishes) {
				const parts = w.wish_date.split('-');
				if (parts.length !== 3) continue;
				const wy = Number(parts[0]);
				const wm = Number(parts[1]);
				const wd = Number(parts[2]);
				if (!Number.isFinite(wy) || !Number.isFinite(wm) || !Number.isFinite(wd)) continue;
				if (wy < cutoffY || (wy === cutoffY && wm < cutoffM) || (wy === cutoffY && wm === cutoffM && wd < cutoffD)) {
					const r = db.run(`DELETE FROM birthday_wishes WHERE id = ?`, [w.id]);
					wishCount += (r as any).changes;
				}
			}
		})();

		if (scheduleCount > 0 || scheduleTaskCount > 0 || processedTaskCount > 0 || wishCount > 0) {
			console.log(`[sqlite] cleanup: ${scheduleCount} schedules + ${scheduleTaskCount} tasks, ${processedTaskCount} done tasks, ${wishCount} wishes`);
		}
	} catch (e) {
		console.warn('[sqlite] cleanup failed:', e);
	}
}

/** 同一手机号唯一，配合 INSERT … ON CONFLICT(contact) 在 DB 层串行化「同号覆盖」，避免并发双插。 */
function ensureRecruitmentContactUniqueIndex(db: Database): void {
	try {
		db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_recruitment_applications_contact ON recruitment_applications(contact)`);
	} catch (e) {
		console.warn('[sqlite] Could not create UNIQUE index on recruitment_applications(contact). Clear duplicate contacts or fix DB.', e);
	}
}

export async function startSQLite(): Promise<Database> {
	if (!sqlite) {
		const dbPath = resolve(config.databasePath);
		mkdirSync(dirname(dbPath), { recursive: true });
		sqlite = new Database(dbPath, { create: true, strict: true });
		initSchema(sqlite);
		sqlite.query('SELECT 1').get();
	}
	return sqlite;
}

export async function checkSQLiteHealth(): Promise<void> {
	if (!sqlite) throw new Error('SQLITE_NOT_STARTED');
	sqlite.query('SELECT 1').get();
}

export async function stopSQLite(): Promise<void> {
	if (sqlite) {
		sqlite.close();
		sqlite = null;
	}
}
