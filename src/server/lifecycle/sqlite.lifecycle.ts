import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Database } from 'bun:sqlite';
import { config } from '../config';

let sqlite: Database | null = null;

function ensureUserColumn(db: Database, column: string, type: string): void {
	const cols = db
		.query(`PRAGMA table_info(users)`)
		.all()
		.map((r: any) => String(r.name));
	if (cols.includes(column)) return;
	db.run(`ALTER TABLE users ADD COLUMN ${column} ${type}`);
}

function ensureBirthdayColumn(db: Database): void {
	ensureUserColumn(db, 'birthday_month', 'INTEGER');
	ensureUserColumn(db, 'birthday_day', 'INTEGER');
}

function ensureHomeAnnouncementColumn(db: Database, column: string, type: string): void {
	const cols = db
		.query(`PRAGMA table_info(home_announcements)`)
		.all()
		.map((r: any) => String(r.name));
	if (cols.includes(column)) return;
	db.run(`ALTER TABLE home_announcements ADD COLUMN ${column} ${type}`);
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

	db.run(
		`CREATE INDEX IF NOT EXISTS idx_recruitment_apps_dept_time ON recruitment_applications(department_sort_order, created_at)`,
	);
	db.run(`CREATE INDEX IF NOT EXISTS idx_recruitment_comments_app ON recruitment_comments(application_id, created_at)`);

	ensureRecruitmentContactUniqueIndex(db);
}

/** 同一手机号唯一，配合 INSERT … ON CONFLICT(contact) 在 DB 层串行化「同号覆盖」，避免并发双插。 */
function ensureRecruitmentContactUniqueIndex(db: Database): void {
	try {
		db.run(
			`CREATE UNIQUE INDEX IF NOT EXISTS idx_recruitment_applications_contact ON recruitment_applications(contact)`,
		);
	} catch (e) {
		console.warn(
			'[sqlite] Could not create UNIQUE index on recruitment_applications(contact). Clear duplicate contacts or fix DB.',
			e,
		);
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
