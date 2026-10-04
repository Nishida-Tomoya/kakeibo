import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// データの置き場所。既定は app/data（.gitignore で除外済み）
export const DATA_DIR = process.env.DATA_DIR ?? path.resolve(here, '../../data');
export const RECEIPT_IMAGE_DIR = path.join(DATA_DIR, 'receipts');

fs.mkdirSync(RECEIPT_IMAGE_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'kakeibo.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  -- レシート1枚分の記録。画像は RECEIPT_IMAGE_DIR にファイルで保存する
  CREATE TABLE IF NOT EXISTS receipts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    store_name     TEXT NOT NULL,
    store_name_raw TEXT,
    date           TEXT NOT NULL,
    total          INTEGER NOT NULL,
    items_json     TEXT NOT NULL,
    image_file     TEXT,
    created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 家計簿の明細（収入・支出）。レシートから登録した明細は receipt_id でレシートとつながる
  CREATE TABLE IF NOT EXISTS transactions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    date       TEXT NOT NULL,
    amount     INTEGER NOT NULL,
    category   TEXT NOT NULL,
    store_name TEXT,
    memo       TEXT,
    source     TEXT NOT NULL CHECK (source IN ('manual', 'receipt')),
    receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

  -- LINE に送った月次レポートの記録（同じ月を二重に送らないため）
  CREATE TABLE IF NOT EXISTS line_reports (
    month   TEXT PRIMARY KEY,
    sent_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
