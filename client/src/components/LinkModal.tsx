// ----------------------------------------------------------------------------------
//  Name:    LinkModal.tsx
//  Author:  Mark Casey
//
//  Purpose: Searchable modal for linking a contact to a contact in another account.
//
//  Features:
//   • <LinkModal /> → link-picker component
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import type { Account, Contact } from '../types';

// ── Types ──────────────────────────────────────────────────
interface LinkModalProps {
  source:      Contact;
  contacts:    Contact[];
  accounts:    Account[];
  excludedIds: string[];
  onClose:     () => void;
  onLink:      (targetId: string) => Promise<void>;
}

// ══ Component ══════════════════════════════════════════════
export function LinkModal({
  source,
  contacts,
  accounts,
  excludedIds,
  onClose,
  onLink,
}: LinkModalProps) {

  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const excluded = useMemo(() => new Set(excludedIds), [excludedIds]);

  const candidates = useMemo(() => {

    const needle = query.trim().toLowerCase();

    return contacts
      .filter((c) => c.accountId !== source.accountId && !excluded.has(c.id))
      .filter((c) => {

        if (!needle) return true;

        const account = accountById.get(c.accountId);

        return (
          c.fullName.toLowerCase().includes(needle) ||
          (c.email ?? '').toLowerCase().includes(needle) ||
          (c.handle ?? '').toLowerCase().includes(needle) ||
          (account?.label.toLowerCase().includes(needle) ?? false)
        );
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .slice(0, 60);
  }, [contacts, source.accountId, excluded, query, accountById]);

  const handleLink = async (targetId: string) => {

    setBusyId(targetId);
    setError(null);

    try {

      await onLink(targetId);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to create link');
      setBusyId(null);
    }
  };

  return (
    <Modal title="Link to another contact" onClose={onClose}>
      <div className="link-modal">
        <p className="form-hint">
          Linking <strong>{source.fullName}</strong> to a contact in a different account.
        </p>
        <input
          className="link-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, handle or platform…"
          autoFocus
        />

        {error && <div className="form-error">{error}</div>}

        <div className="link-list">
          {candidates.length === 0 && <div className="sidebar-empty">No contacts available to link.</div>}
          {candidates.map((candidate) => {

            const account = accountById.get(candidate.accountId);

            return (
              <button
                key={candidate.id}
                type="button"
                className="link-candidate"
                disabled={busyId === candidate.id}
                onClick={() => handleLink(candidate.id)}
              >
                <span className="linked-dot" style={{ background: account?.color ?? '#6C7A89' }}>
                  {account?.icon ?? '●'}
                </span>
                <span className="link-candidate-text">
                  <span className="link-candidate-name">{candidate.fullName}</span>
                  <span className="link-candidate-meta">
                    {account?.label ?? 'Unknown'}
                    {candidate.email ? ` · ${candidate.email}` : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
