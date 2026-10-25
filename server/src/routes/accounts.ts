// ----------------------------------------------------------------------------------
//  Name:    accounts.ts
//  Author:  Mark Casey
//
//  Purpose: REST routes for managing platform accounts and their encrypted
//           credentials.
//
//  Exported API:
//   • accountsRouter → express Router
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { decryptSecret, encryptSecret } from '../crypto.js';
import type { Account, Credentials } from '../types.js';

// ── Types ──────────────────────────────────────────────────
interface AccountRow {
  id:             string;
  platform:       string;
  label:          string;
  color:          string;
  icon:           string | null;
  credentials_enc: string | null;
  created_at:     string;
  updated_at:     string;
}

// ══ Mappers ════════════════════════════════════════════════
function toAccount(row: AccountRow): Account {

  return {
    id: row.id,
    platform: row.platform,
    label: row.label,
    color: row.color,
    icon: row.icon ?? row.label.charAt(0).toUpperCase(),
    hasCredentials: row.credentials_enc != null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeCredentials(credentials: Credentials | null | undefined): string | null {

  if (!credentials) {

    return null;
  }

  const entries = Object.entries(credentials).filter(([, value]) => typeof value === 'string' && value.trim() !== '');

  if (entries.length === 0) {

    return null;
  }

  return encryptSecret(JSON.stringify(Object.fromEntries(entries)));
}

// ══ Router ═════════════════════════════════════════════════
export const accountsRouter = Router();

accountsRouter.get('/', (_req, res) => {

  const rows = db
    .prepare('SELECT * FROM accounts ORDER BY created_at ASC')
    .all() as unknown as AccountRow[];

  res.json(rows.map(toAccount));
});

accountsRouter.get('/:id', (req, res) => {

  const row = db
    .prepare('SELECT * FROM accounts WHERE id = ?')
    .get(req.params.id) as unknown as AccountRow | undefined;

  if (!row) {

    res.status(404).json({ error: 'Account not found' });
    return;
  }

  res.json(toAccount(row));
});

accountsRouter.get('/:id/credentials', (req, res) => {

  const row = db
    .prepare('SELECT credentials_enc FROM accounts WHERE id = ?')
    .get(req.params.id) as unknown as { credentials_enc: string | null } | undefined;

  if (!row) {

    res.status(404).json({ error: 'Account not found' });
    return;
  }

  if (!row.credentials_enc) {

    res.json({ credentials: null });
    return;
  }

  try {

    res.json({ credentials: JSON.parse(decryptSecret(row.credentials_enc)) as Credentials });

  } catch {

    res.status(500).json({ error: 'Failed to decrypt stored credentials' });
  }
});

accountsRouter.post('/', (req, res) => {

  const body = (req.body ?? {}) as {
    platform?: string;
    label?: string;
    color?: string;
    icon?: string;
    credentials?: Credentials;
  };
  const platform = body.platform?.trim();
  const label = body.label?.trim();

  if (!platform || !label) {

    res.status(400).json({ error: 'platform and label are required' });
    return;
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO accounts (id, platform, label, color, icon, credentials_enc, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    platform,
    label,
    body.color ?? '#6C7A89',
    body.icon ?? label.charAt(0).toUpperCase(),
    serializeCredentials(body.credentials),
    now,
    now,
  );

  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as unknown as AccountRow;

  res.status(201).json(toAccount(row));
});

accountsRouter.put('/:id', (req, res) => {

  const existing = db
    .prepare('SELECT * FROM accounts WHERE id = ?')
    .get(req.params.id) as unknown as AccountRow | undefined;

  if (!existing) {

    res.status(404).json({ error: 'Account not found' });
    return;
  }

  const body = (req.body ?? {}) as {
    platform?: string;
    label?: string;
    color?: string;
    icon?: string;
    credentials?: Credentials;
  };
  const platform = body.platform?.trim() ?? existing.platform;
  const label = body.label?.trim() ?? existing.label;
  const color = body.color ?? existing.color;
  const icon = body.icon ?? existing.icon ?? label.charAt(0).toUpperCase();

  let credentialsEnc = existing.credentials_enc;

  if (body.credentials !== undefined) {

    credentialsEnc = serializeCredentials(body.credentials);
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE accounts SET platform = ?, label = ?, color = ?, icon = ?, credentials_enc = ?, updated_at = ?
     WHERE id = ?`,
  ).run(platform, label, color, icon, credentialsEnc, now, existing.id);

  const row = db
    .prepare('SELECT * FROM accounts WHERE id = ?')
    .get(existing.id) as unknown as AccountRow;

  res.json(toAccount(row));
});

accountsRouter.delete('/:id', (req, res) => {

  const existing = db.prepare('SELECT id FROM accounts WHERE id = ?').get(req.params.id) as
    | { id: string }
    | undefined;

  if (!existing) {

    res.status(404).json({ error: 'Account not found' });
    return;
  }

  db.prepare('DELETE FROM accounts WHERE id = ?').run(existing.id);

  res.json({ ok: true });
});
