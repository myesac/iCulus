// ----------------------------------------------------------------------------------
//  Name:    autolink.ts
//  Author:  Mark Casey
//
//  Purpose: Recomputes auto-detected links between contacts in different accounts.
//           Manual links are preserved; auto links are rebuilt from scratch.
//
//  Exported API:
//   • rescanAutoLinks() → void
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { randomUUID } from 'node:crypto';
import { db } from './db.js';

// ── Types ──────────────────────────────────────────────────
interface ContactRow {
  id:         string;
  account_id: string;
  full_name:  string;
  email:      string | null;
  phone:      string | null;
}

// ══ Normalisation ══════════════════════════════════════════
function normalizeEmail(value: string | null | undefined): string {

  return (value ?? '').trim().toLowerCase();
}

function normalizePhone(value: string | null | undefined): string {

  return (value ?? '').replace(/\D/g, '');
}

function normalizeName(value: string | null | undefined): string {

  return (value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ══ Rescan ═════════════════════════════════════════════════
/**
 * Recomputes auto-detected links between contacts that live in different
 * accounts. Manual links are always preserved; auto links are rebuilt from
 * scratch each time.
 */
export function rescanAutoLinks(): void {

  const contacts = db
    .prepare('SELECT id, account_id, full_name, email, phone FROM contacts')
    .all() as unknown as ContactRow[];

  db.prepare("DELETE FROM links WHERE kind = 'auto'").run();

  const manualPairs = new Set<string>();
  const manualRows = db.prepare("SELECT source_id, target_id FROM links WHERE kind = 'manual'").all() as {
    source_id: string;
    target_id: string;
  }[];

  for (const row of manualRows) {

    manualPairs.add(pairKey(row.source_id, row.target_id));
  }

  const insert = db.prepare(
    'INSERT OR IGNORE INTO links (id, source_id, target_id, kind, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const now = new Date().toISOString();

  for (let i = 0; i < contacts.length; i += 1) {

    for (let j = i + 1; j < contacts.length; j += 1) {

      const a = contacts[i];
      const b = contacts[j];

      if (a.account_id === b.account_id) {

        continue;
      }

      if (manualPairs.has(pairKey(a.id, b.id))) {

        continue;
      }

      const emailA = normalizeEmail(a.email);
      const emailB = normalizeEmail(b.email);
      const phoneA = normalizePhone(a.phone);
      const phoneB = normalizePhone(b.phone);
      const nameA = normalizeName(a.full_name);
      const nameB = normalizeName(b.full_name);

      let confidence = 0;

      if (emailA && emailA === emailB) {

        confidence = Math.max(confidence, 1.0);
      }

      if (phoneA && phoneB && phoneA.length >= 7 && phoneA === phoneB) {

        confidence = Math.max(confidence, 0.95);
      }

      if (nameA && nameA === nameB) {

        confidence = Math.max(confidence, 0.75);
      }

      if (confidence > 0) {

        insert.run(randomUUID(), a.id, b.id, 'auto', confidence, now);
      }
    }
  }
}

// ══ Helpers ════════════════════════════════════════════════
function pairKey(a: string, b: string): string {

  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
