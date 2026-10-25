// ----------------------------------------------------------------------------------
//  Name:    layout.ts
//  Author:  Mark Casey
//
//  Purpose: Deterministic graph layouts (circle, hex, spiral, groups) plus the
//           stable starting positions used to seed the force simulation.
//
//  Features:
//   • Point            → interface
//   • GRAPH_W          → number constant
//   • GRAPH_H          → number constant
//   • MAIN_RADIUS      → number constant
//   • SUB_RADIUS       → number constant
//   • initialPositions → Map<string, Point>
//   • layoutPositions  → Map<string, Point>
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import type { Account, Contact, LayoutKind } from '../types';

// ── Types ──────────────────────────────────────────────────
export interface Point {
  x: number;
  y: number;
}

// ── Constants ──────────────────────────────────────────────
export const GRAPH_W     = 1_200;
export const GRAPH_H     = 760;
export const MAIN_RADIUS = 44;
export const SUB_RADIUS  = 22;

const CX = GRAPH_W / 2;
const CY = GRAPH_H / 2;

// ══ Helpers ════════════════════════════════════════════════
function byAccount(visibleContacts: Contact[]): Map<string, Contact[]> {

  const groups = new Map<string, Contact[]>();

  for (const contact of visibleContacts) {

    const list = groups.get(contact.accountId) ?? [];
    list.push(contact);
    groups.set(contact.accountId, list);
  }

  return groups;
}

function placeRing(pos: Map<string, Point>, parent: Point, subs: Contact[], radius: number): void {

  subs.forEach((contact, index) => {

    const angle = subs.length <= 1 ? 0 : (index / subs.length) * Math.PI * 2 - Math.PI / 2;
    pos.set(contact.id, {
      x: parent.x + radius * Math.cos(angle),
      y: parent.y + radius * Math.sin(angle),
    });
  });
}

function attachSubsRing(pos: Map<string, Point>, visibleContacts: Contact[], radius: number): void {

  for (const [accountId, subs] of byAccount(visibleContacts)) {

    const parent = pos.get(accountId);

    if (!parent) {

      continue;
    }

    placeRing(pos, parent, subs, radius);
  }
}

function attachSubsColumn(pos: Map<string, Point>, visibleContacts: Contact[]): void {

  for (const [accountId, subs] of byAccount(visibleContacts)) {

    const parent = pos.get(accountId);

    if (!parent) {

      continue;
    }

    subs.forEach((contact, index) => {

      pos.set(contact.id, { x: parent.x, y: parent.y + 88 + index * 52 });
    });
  }
}

// ══ Layouts ════════════════════════════════════════════════
/** Stable starting positions (also used to seed the force simulation). */
export function initialPositions(accounts: Account[], visibleContacts: Contact[]): Map<string, Point> {

  const pos = new Map<string, Point>();
  const count = accounts.length;
  const radius = Math.min(GRAPH_W, GRAPH_H) / 2 - 140;

  accounts.forEach((account, index) => {

    const angle = count <= 1 ? -Math.PI / 2 : (index / count) * Math.PI * 2 - Math.PI / 2;
    pos.set(account.id, { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) });
  });

  attachSubsRing(pos, visibleContacts, 116);

  return pos;
}

function circleLayout(accounts: Account[], visibleContacts: Contact[]): Map<string, Point> {

  const pos = initialPositions(accounts, []);

  attachSubsRing(pos, visibleContacts, 118);

  return pos;
}

function hexLayout(accounts: Account[], visibleContacts: Contact[]): Map<string, Point> {

  const pos = new Map<string, Point>();
  const count = accounts.length;
  const outer = Math.min(GRAPH_W, GRAPH_H) / 2 - 140;

  let placed = 0;
  let ring = 0;

  while (placed < count) {

    const slots = ring === 0 ? 6 : ring * 6;
    const radius = Math.max(70, outer - ring * 104);
    const startAngle = -Math.PI / 2 + (ring % 2 === 0 ? 0 : Math.PI / slots);

    for (let slot = 0; slot < slots && placed < count; slot += 1) {

      const angle = startAngle + (slot / slots) * Math.PI * 2;
      const account = accounts[placed];
      pos.set(account.id, { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) });
      placed += 1;
    }

    ring += 1;
  }

  attachSubsRing(pos, visibleContacts, 104);

  return pos;
}

function spiralLayout(accounts: Account[], visibleContacts: Contact[]): Map<string, Point> {

  const pos = new Map<string, Point>();

  accounts.forEach((account, index) => {

    const theta = index * 2.39996323; // golden angle
    const radius = 50 + 52 * Math.sqrt(index);
    pos.set(account.id, {
      x: CX + radius * Math.cos(theta),
      y: CY + radius * Math.sin(theta),
    });
  });

  attachSubsRing(pos, visibleContacts, 96);

  return pos;
}

function groupsLayout(accounts: Account[], visibleContacts: Contact[]): Map<string, Point> {

  const pos = new Map<string, Point>();
  const count = accounts.length;
  const columns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(count))));
  const cellWidth = GRAPH_W / columns;

  accounts.forEach((account, index) => {

    const col = index % columns;
    const row = Math.floor(index / columns);
    pos.set(account.id, { x: col * cellWidth + cellWidth / 2, y: 132 + row * 210 });
  });

  attachSubsColumn(pos, visibleContacts);

  return pos;
}

// ══ Dispatch ═══════════════════════════════════════════════
export function layoutPositions(
  kind: LayoutKind,
  accounts: Account[],
  visibleContacts: Contact[],
): Map<string, Point> {

  switch (kind) {

    case 'circle':
      return circleLayout(accounts, visibleContacts);
    case 'hex':
      return hexLayout(accounts, visibleContacts);
    case 'spiral':
      return spiralLayout(accounts, visibleContacts);
    case 'groups':
      return groupsLayout(accounts, visibleContacts);
    case 'force':
    default:
      return initialPositions(accounts, visibleContacts);
  }
}
