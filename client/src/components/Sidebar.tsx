// ----------------------------------------------------------------------------------
//  Name:    Sidebar.tsx
//  Author:  Mark Casey
//
//  Purpose: Left-hand account list with per-account contact counts and add-account
//           actions.
//
//  Features:
//   • <Sidebar /> → account list component
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { useMemo } from 'react';
import type { Account, Contact } from '../types';

// ── Types ──────────────────────────────────────────────────
interface SidebarProps {
  accounts:       Account[];
  contacts:       Contact[];
  selectedMainId: string | null;
  onSelect:       (id: string) => void;
  onAddAccount:   () => void;
}

// ══ Component ══════════════════════════════════════════════
export function Sidebar({
  accounts,
  contacts,
  selectedMainId,
  onSelect,
  onAddAccount,
}: SidebarProps) {

  const countByAccount = useMemo(() => {

    const counts = new Map<string, number>();

    for (const contact of contacts) {

      counts.set(contact.accountId, (counts.get(contact.accountId) ?? 0) + 1);
    }

    return counts;
  }, [contacts]);

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span className="sidebar-title">Accounts</span>
        <button type="button" className="icon-btn" onClick={onAddAccount} title="Add account" aria-label="Add account">
          +
        </button>
      </div>

      <div className="sidebar-list">
        {accounts.length === 0 && <div className="sidebar-empty">No accounts yet.</div>}
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            className={`account-item${selectedMainId === account.id ? ' is-active' : ''}`}
            onClick={() => onSelect(account.id)}
          >
            <span className="account-item-dot" style={{ background: account.color }}>
              {account.icon}
            </span>
            <span className="account-item-label">{account.label}</span>
            <span className="account-item-count">{countByAccount.get(account.id) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-foot">
        <button type="button" className="btn btn-primary btn-block" onClick={onAddAccount}>
          + Add account
        </button>
      </div>
    </aside>
  );
}
