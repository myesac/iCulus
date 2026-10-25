// ----------------------------------------------------------------------------------
//  Name:    links.ts
//  Author:  Mark Casey
//
//  Purpose: REST routes for creating, listing and removing links between contacts,
//           and for triggering a manual rescan.
//
//  Exported API:
//   • linksRouter → express Router
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { rescanAutoLinks } from '../autolink.js';
import type { ContactLink } from '../types.js';

// ── Types ──────────────────────────────────────────────────
interface LinkRow {
  id:         string;
  source_id:  string;
  target_id:  string;
  kind:       'auto' | 'manual';
  confidence: number;
  created_at: string;
}

// ══ Mappers ════════════════════════════════════════════════
function toLink(row: LinkRow): ContactLink {

  return {
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    kind: row.kind,
    confidence: row.confidence,
    createdAt: row.created_at,
  };
}

// ══ Router ═════════════════════════════════════════════════
export const linksRouter = Router();

linksRouter.get('/', (_req, res) => {

  const rows = db.prepare('SELECT * FROM links ORDER BY created_at ASC').all() as unknown as LinkRow[];

  res.json(rows.map(toLink));
});

linksRouter.post('/', (req, res) => {

  const body = (req.body ?? {}) as { sourceId?: string; targetId?: string };
  const sourceId = body.sourceId?.trim();
  const targetId = body.targetId?.trim();

  if (!sourceId || !targetId) {

    res.status(400).json({ error: 'sourceId and targetId are required' });
    return;
  }

  if (sourceId === targetId) {

    res.status(400).json({ error: 'A contact cannot be linked to itself' });
    return;
  }

  const source = db.prepare('SELECT id, account_id FROM contacts WHERE id = ?').get(sourceId) as
    | { id: string; account_id: string }
    | undefined;
  const target = db.prepare('SELECT id, account_id FROM contacts WHERE id = ?').get(targetId) as
    | { id: string; account_id: string }
    | undefined;

  if (!source || !target) {

    res.status(404).json({ error: 'One or both contacts not found' });
    return;
  }

  if (source.account_id === target.account_id) {

    res.status(400).json({ error: 'Contacts in the same account cannot be linked' });
    return;
  }

  const existing = db
    .prepare(
      'SELECT id FROM links WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)',
    )
    .get(sourceId, targetId, targetId, sourceId);

  if (existing) {

    res.status(409).json({ error: 'These contacts are already linked' });
    return;
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO links (id, source_id, target_id, kind, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, sourceId, targetId, 'manual', 1.0, now);

  const row = db.prepare('SELECT * FROM links WHERE id = ?').get(id) as unknown as LinkRow;

  res.status(201).json(toLink(row));
});

linksRouter.delete('/:id', (req, res) => {

  const existing = db.prepare('SELECT id FROM links WHERE id = ?').get(req.params.id) as
    | { id: string }
    | undefined;

  if (!existing) {

    res.status(404).json({ error: 'Link not found' });
    return;
  }

  db.prepare('DELETE FROM links WHERE id = ?').run(existing.id);

  res.json({ ok: true });
});

linksRouter.post('/rescan', (_req, res) => {

  rescanAutoLinks();

  const rows = db.prepare('SELECT * FROM links ORDER BY created_at ASC').all() as unknown as LinkRow[];

  res.json(rows.map(toLink));
});
