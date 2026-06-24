import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.TFA_DATA_DIR ?? join(here, '..', 'data');
export const SESSIONS_DIR = join(dataDir, 'sessions');
export const RETURNS_DIR = join(dataDir, 'returns');

mkdirSync(SESSIONS_DIR, { recursive: true });
mkdirSync(RETURNS_DIR, { recursive: true });

const dbPath = process.env.TFA_DB_PATH ?? join(dataDir, 'sessions.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    state TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    session_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    ts INTEGER NOT NULL,
    PRIMARY KEY (session_id, idx)
  );
`);

const stmts = {
  insertSession: db.prepare(
    'INSERT INTO sessions (id, created_at, status, state) VALUES (?, ?, ?, ?)',
  ),
  updateSession: db.prepare('UPDATE sessions SET status = ?, state = ? WHERE id = ?'),
  getSession: db.prepare('SELECT id, created_at, status, state FROM sessions WHERE id = ?'),
  insertMessage: db.prepare(
    'INSERT OR REPLACE INTO messages (session_id, idx, role, content, ts) VALUES (?, ?, ?, ?, ?)',
  ),
  getMessages: db.prepare('SELECT role, content FROM messages WHERE session_id = ? ORDER BY idx'),
  countMessages: db.prepare('SELECT COUNT(*) as n FROM messages WHERE session_id = ?'),
};

export function createSessionRow(id: string, createdAt: number, status: string, state: string) {
  stmts.insertSession.run(id, createdAt, status, state);
}

export function updateSessionRow(id: string, status: string, state: string) {
  stmts.updateSession.run(status, state, id);
}

export function getSessionRow(
  id: string,
): { id: string; created_at: number; status: string; state: string } | undefined {
  return stmts.getSession.get(id) as never;
}

export function appendMessageRow(sessionId: string, role: string, content: unknown) {
  const n = (stmts.countMessages.get(sessionId) as { n: number }).n;
  stmts.insertMessage.run(sessionId, n, role, JSON.stringify(content), Date.now());
}

export function getMessageRows(sessionId: string): Array<{ role: string; content: unknown }> {
  const rows = stmts.getMessages.all(sessionId) as Array<{ role: string; content: string }>;
  return rows.map((r) => ({ role: r.role, content: JSON.parse(r.content) }));
}
