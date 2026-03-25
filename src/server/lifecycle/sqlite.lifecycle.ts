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
    )
  `);

	ensureUserColumn(db, 'avatar_path', 'TEXT');
	ensureUserColumn(db, 'profile_bg_path', 'TEXT');
	ensureUserColumn(db, 'nickname', 'TEXT');
	ensureUserColumn(db, 'signature', 'TEXT');
	ensureUserColumn(db, 'qq', 'TEXT');

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
    )
  `);

	db.run(`CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status)`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_applications_status ON account_applications(status)`);
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
