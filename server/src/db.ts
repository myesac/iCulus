// ----------------------------------------------------------------------------------
//  Name:    db.ts
//  Author:  Mark Casey
//
//  Purpose: Opens the SQLite database and creates the schema (accounts, contacts,
//           links) if it does not yet exist.
//
//  Exported API:
//   • db → DatabaseSync (the shared database connection)
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { DATA_DIR, DB_PATH } from './paths.js';

// ══ Database ═══════════════════════════════════════════════
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    label TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT,
    credentials_enc TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    handle TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    company TEXT,
    title TEXT,
    location TEXT,
    notes TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    custom_links TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'manual',
    confidence REAL NOT NULL DEFAULT 1.0,
    created_at TEXT NOT NULL,
    UNIQUE(source_id, target_id)
  );

  CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
  CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
  CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
  CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
`);
