// ----------------------------------------------------------------------------------
//  Name:    NodeCard.tsx
//  Author:  Mark Casey
//
//  Purpose: Detail card shown for the selected account or contact, with field rows,
//           tags, notes and link management.
//
//  Features:
//   • <NodeCard /> → account/contact detail card component
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { useMemo, type ReactNode } from 'react';
import type { Account, Contact, ContactLink } from '../types';

// ── Types ──────────────────────────────────────────────────
interface NodeCardProps {
  account:         Account | null;
  contact:         Contact | null;
  accounts:        Account[];
  contacts:        Contact[];
  links:           ContactLink[];
  onClose:         () => void;
  onEditAccount:   (account: Account) => void;
  onEditContact:   (contact: Contact) => void;
  onDeleteAccount: (id: string) => void;
  onDeleteContact: (id: string) => void;
  onAddContact:    (accountId: string) => void;
  onLinkContact:   (contact: Contact) => void;
  onUnlink:        (linkId: string) => void;
}

// ══ Component ══════════════════════════════════════════════
export function NodeCard(props: NodeCardProps) {

  if (props.contact) {

    return <ContactCard {...props} />;
  }

  if (props.account) {

    return <AccountCard {...props} />;
  }

  return null;
}

// ══ Account card ═══════════════════════════════════════════
function AccountCard({
  account,
  contacts,
  onClose,
  onEditAccount,
  onDeleteAccount,
  onAddContact,
}: NodeCardProps) {

  const contactCount = useMemo(
    () => contacts.filter((c) => c.accountId === account!.id).length,
    [contacts, account],
  );

  return (
    <CardShell onClose={onClose}>
      <div className="card-hero" style={{ background: `linear-gradient(135deg, ${account!.color}, ${account!.color}88)` }}>
        <span className="card-avatar-lg">{account!.icon}</span>
        <div>
          <div className="card-title">{account!.label}</div>
          <div className="card-subtitle">@{account!.platform}</div>
        </div>
      </div>
      <div className="card-body">
        <div className="card-stats">
          <div className="card-stat">
            <span className="card-stat-value">{contactCount}</span>
            <span className="card-stat-label">contacts</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-value">{account!.hasCredentials ? '🔒' : '—'}</span>
            <span className="card-stat-label">credentials</span>
          </div>
        </div>

        <p className="card-hint">
          {account!.hasCredentials
            ? 'Credentials are stored encrypted with AES-256-GCM.'
            : 'No credentials stored yet. Add API keys or login details if you plan to sync later.'}
        </p>

        <div className="card-actions">
          <button type="button" className="btn btn-primary" onClick={() => onAddContact(account!.id)}>
            + Add contact
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onEditAccount(account!)}>
            Edit account
          </button>
          <button type="button" className="btn btn-danger" onClick={() => onDeleteAccount(account!.id)}>
            Delete
          </button>
        </div>
      </div>
    </CardShell>
  );
}

// ══ Contact card ═══════════════════════════════════════════
function ContactCard({
  contact,
  accounts,
  contacts,
  links,
  onClose,
  onEditContact,
  onDeleteContact,
  onLinkContact,
  onUnlink,
}: NodeCardProps) {

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const account = accountById.get(contact!.accountId);

  const related = useMemo(
    () =>
      links.filter((l) => l.sourceId === contact!.id || l.targetId === contact!.id),
    [links, contact],
  );

  return (
    <CardShell onClose={onClose}>
      <div className="card-header-row">
        <span className="card-avatar" style={{ background: account?.color ?? '#6C7A89' }}>
          {initials(contact!.fullName)}
        </span>
        <div className="card-header-text">
          <div className="card-title">{contact!.fullName}</div>
          <div className="card-subtitle">
            <span className="badge" style={{ background: account?.color ?? '#6C7A89' }}>
              {account?.icon} {account?.label ?? 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="card-body">
        <div className="field-list">
          {contact!.handle && <FieldRow icon="@" label="Handle" value={contact!.handle} />}
          {contact!.email && (
            <FieldRow icon="✉" label="Email" value={contact!.email} href={`mailto:${contact!.email}`} />
          )}
          {contact!.phone && (
            <FieldRow icon="☏" label="Phone" value={contact!.phone} href={`tel:${contact!.phone}`} />
          )}
          {contact!.title && <FieldRow icon="⌂" label="Title" value={contact!.title} />}
          {contact!.company && <FieldRow icon="▦" label="Company" value={contact!.company} />}
          {contact!.location && <FieldRow icon="⌖" label="Location" value={contact!.location} />}
        </div>

        {contact!.tags.length > 0 && (
          <div className="card-section">
            <div className="card-section-title">Tags</div>
            <div className="tag-list">
              {contact!.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {contact!.customLinks.length > 0 && (
          <div className="card-section">
            <div className="card-section-title">Links</div>
            <div className="custom-links">
              {contact!.customLinks.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="custom-link">
                  {url}
                </a>
              ))}
            </div>
          </div>
        )}

        {contact!.notes && (
          <div className="card-section">
            <div className="card-section-title">Notes</div>
            <p className="card-notes">{contact!.notes}</p>
          </div>
        )}

        <div className="card-section">
          <div className="card-section-title">Linked accounts</div>
          {related.length === 0 && <p className="card-hint">No links yet.</p>}
          {related.map((link) => {

            const otherId = link.sourceId === contact!.id ? link.targetId : link.sourceId;
            const other = contactById.get(otherId);

            if (!other) return null;

            const otherAccount = accountById.get(other.accountId);

            return (
              <div key={link.id} className="linked-row">
                <span className="linked-dot" style={{ background: otherAccount?.color ?? '#6C7A89' }} />
                <div className="linked-text">
                  <div className="linked-name">{other.fullName}</div>
                  <div className="linked-meta">
                    {otherAccount?.label ?? 'Unknown'}
                    <span className={`link-kind link-kind-${link.kind}`}>
                      {link.kind === 'auto' ? `auto · ${Math.round(link.confidence * 100)}%` : 'manual'}
                    </span>
                  </div>
                </div>
                <button type="button" className="icon-btn icon-btn-sm" title="Remove link" onClick={() => onUnlink(link.id)}>
                  ✕
                </button>
              </div>
            );
          })}
          <button type="button" className="btn btn-ghost btn-block" onClick={() => onLinkContact(contact!)}>
            + Link to another contact
          </button>
        </div>

        <div className="card-actions">
          <button type="button" className="btn btn-primary" onClick={() => onEditContact(contact!)}>
            Edit contact
          </button>
          <button type="button" className="btn btn-danger" onClick={() => onDeleteContact(contact!.id)}>
            Delete
          </button>
        </div>
      </div>
    </CardShell>
  );
}

// ══ Card shell ═════════════════════════════════════════════
function CardShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {

  return (
    <aside className="node-card">
      <button type="button" className="icon-btn node-card-close" onClick={onClose} aria-label="Close card">
        ✕
      </button>
      {children}
    </aside>
  );
}

// ══ Field row ══════════════════════════════════════════════
function FieldRow({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
}) {

  return (
    <div className="field-row">
      <span className="field-icon">{icon}</span>
      <div className="field-content">
        <span className="field-label">{label}</span>
        {href ? (
          <a className="field-value field-value-link" href={href}>
            {value}
          </a>
        ) : (
          <span className="field-value">{value}</span>
        )}
      </div>
    </div>
  );
}

// ══ Helpers ════════════════════════════════════════════════
function initials(name: string): string {

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {

    return '?';
  }

  if (parts.length === 1) {

    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}
