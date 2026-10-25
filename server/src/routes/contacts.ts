// ----------------------------------------------------------------------------------
//  Name:    contacts.ts
//  Author:  Mark Casey
//
//  Purpose: REST routes for managing contacts and triggering automatic link
//           detection after changes.
//
//  Exported API:
//   • contactsRouter → express Router
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { rescanAutoLinks } from '../autolink.js';
import type { Contact } from '../types.js';

// ── Types ──────────────────────────────────────────────────
interface ContactRow {
  id:          string;
  account_id:  string;
  full_name:   string;
  handle:      string | null;
  email:       string | null;
  phone:       string | null;
  avatar_url:  string | null;
  company:     string | null;
  title:       string | null;
  location:    string | null;
  notes:       string | null;
  tags:        string;
  custom_links: string;
  created_at:  string;
  updated_at:  string;
}

interface ContactInput {
  accountId?:   string;
  fullName?:    string;
  handle?:      string;
  email?:       string;
  phone?:       string;
  avatarUrl?:   string;
  company?:     string;
  title?:       string;
  location?:    string;
  notes?:       string;
  tags?:        string[];
  customLinks?: string[];
}

// ══ Mappers ════════════════════════════════════════════════
function parseJsonArray(value: string | null | undefined): string[] {

  if (!value) {

    return [];
  }

  try {

    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];

  } catch {

    return [];
  }
}

function toContact(row: ContactRow): Contact {

  return {
    id: row.id,
    accountId: row.account_id,
    fullName: row.full_name,
    handle: row.handle,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    company: row.company,
    title: row.title,
    location: row.location,
    notes: row.notes,
    tags: parseJsonArray(row.tags),
    customLinks: parseJsonArray(row.custom_links),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ══ Helpers ════════════════════════════════════════════════
function clean(value: string | null | undefined): string | null {

  const trimmed = (value ?? '').trim();

  return trimmed.length > 0 ? trimmed : null;
}

function cleanList(value: string[] | null | undefined): string[] {

  if (!Array.isArray(value)) {

    return [];
  }

  return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
}

// ══ Router ═════════════════════════════════════════════════
export const contactsRouter = Router();

contactsRouter.get('/', (req, res) => {

  const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : null;
  const rows = accountId
    ? (db
        .prepare('SELECT * FROM contacts WHERE account_id = ? ORDER BY created_at ASC')
        .all(accountId) as unknown as ContactRow[])
    : (db.prepare('SELECT * FROM contacts ORDER BY created_at ASC').all() as unknown as ContactRow[]);

  res.json(rows.map(toContact));
});

contactsRouter.get('/:id', (req, res) => {

  const row = db
    .prepare('SELECT * FROM contacts WHERE id = ?')
    .get(req.params.id) as unknown as ContactRow | undefined;

  if (!row) {

    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  res.json(toContact(row));
});

contactsRouter.post('/', (req, res) => {

  const body = (req.body ?? {}) as ContactInput;
  const accountId = body.accountId?.trim();
  const fullName = body.fullName?.trim();

  if (!accountId || !fullName) {

    res.status(400).json({ error: 'accountId and fullName are required' });
    return;
  }

  const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(accountId);

  if (!account) {

    res.status(400).json({ error: 'Account does not exist' });
    return;
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO contacts
       (id, account_id, full_name, handle, email, phone, avatar_url, company, title, location, notes, tags, custom_links, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    accountId,
    fullName,
    clean(body.handle),
    clean(body.email),
    clean(body.phone),
    clean(body.avatarUrl),
    clean(body.company),
    clean(body.title),
    clean(body.location),
    clean(body.notes),
    JSON.stringify(cleanList(body.tags)),
    JSON.stringify(cleanList(body.customLinks)),
    now,
    now,
  );

  rescanAutoLinks();

  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as unknown as ContactRow;

  res.status(201).json(toContact(row));
});

contactsRouter.put('/:id', (req, res) => {

  const existing = db
    .prepare('SELECT * FROM contacts WHERE id = ?')
    .get(req.params.id) as unknown as ContactRow | undefined;

  if (!existing) {

    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  const body = (req.body ?? {}) as ContactInput;
  const fullName = body.fullName?.trim() ?? existing.full_name;

  if (!fullName) {

    res.status(400).json({ error: 'fullName is required' });
    return;
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE contacts SET
       full_name = ?, handle = ?, email = ?, phone = ?, avatar_url = ?, company = ?, title = ?,
       location = ?, notes = ?, tags = ?, custom_links = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    fullName,
    clean(body.handle),
    clean(body.email),
    clean(body.phone),
    clean(body.avatarUrl),
    clean(body.company),
    clean(body.title),
    clean(body.location),
    clean(body.notes),
    JSON.stringify(cleanList(body.tags)),
    JSON.stringify(cleanList(body.customLinks)),
    now,
    existing.id,
  );

  rescanAutoLinks();

  const row = db
    .prepare('SELECT * FROM contacts WHERE id = ?')
    .get(existing.id) as unknown as ContactRow;

  res.json(toContact(row));
});

contactsRouter.delete('/:id', (req, res) => {

  const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id) as
    | { id: string }
    | undefined;

  if (!existing) {

    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  db.prepare('DELETE FROM contacts WHERE id = ?').run(existing.id);

  rescanAutoLinks();

  res.json({ ok: true });
});
