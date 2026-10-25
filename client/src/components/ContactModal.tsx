// ----------------------------------------------------------------------------------
//  Name:    ContactModal.tsx
//  Author:  Mark Casey
//
//  Purpose: Add/edit form for a contact, including tags, custom links and notes.
//
//  Features:
//   • ContactFormValues → interface
//   • <ContactModal />  → contact form component
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import type { Contact } from '../types';

// ── Types ──────────────────────────────────────────────────
export interface ContactFormValues {
  fullName:    string;
  handle:      string;
  email:       string;
  phone:       string;
  avatarUrl:   string;
  company:     string;
  title:       string;
  location:    string;
  notes:       string;
  tags:        string[];
  customLinks: string[];
}

interface ContactModalProps {
  contact: Contact | null;
  onClose: () => void;
  onSave:  (values: ContactFormValues) => Promise<void>;
}

// ══ Helpers ════════════════════════════════════════════════
function splitList(value: string): string[] {

  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// ══ Component ══════════════════════════════════════════════
export function ContactModal({ contact, onClose, onSave }: ContactModalProps) {

  const [fullName, setFullName] = useState(contact?.fullName ?? '');
  const [handle, setHandle] = useState(contact?.handle ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(contact?.avatarUrl ?? '');
  const [company, setCompany] = useState(contact?.company ?? '');
  const [title, setTitle] = useState(contact?.title ?? '');
  const [location, setLocation] = useState(contact?.location ?? '');
  const [notes, setNotes] = useState(contact?.notes ?? '');
  const [tagsText, setTagsText] = useState(contact?.tags.join(', ') ?? '');
  const [linksText, setLinksText] = useState(contact?.customLinks.join('\n') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {

    event.preventDefault();

    if (!fullName.trim()) {

      setError('Full name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {

      await onSave({
        fullName: fullName.trim(),
        handle: handle.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim(),
        company: company.trim(),
        title: title.trim(),
        location: location.trim(),
        notes: notes.trim(),
        tags: splitList(tagsText),
        customLinks: splitList(linksText),
      });

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to save contact');
      setSaving(false);
    }
  };

  return (
    <Modal title={contact ? 'Edit contact' : 'Add contact'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label className="form-field">
            <span className="form-label">Full name *</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </label>
          <label className="form-field">
            <span className="form-label">Handle</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@janedoe" />
          </label>
        </div>

        <div className="form-row">
          <label className="form-field">
            <span className="form-label">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
          </label>
          <label className="form-field">
            <span className="form-label">Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
          </label>
        </div>

        <div className="form-row">
          <label className="form-field">
            <span className="form-label">Company</span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." />
          </label>
          <label className="form-field">
            <span className="form-label">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product Designer" />
          </label>
        </div>

        <div className="form-row">
          <label className="form-field">
            <span className="form-label">Location</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="London, UK" />
          </label>
          <label className="form-field">
            <span className="form-label">Avatar URL</span>
            <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…/photo.jpg" />
          </label>
        </div>

        <label className="form-field">
          <span className="form-label">Tags (comma separated)</span>
          <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="friend, work, investor" />
        </label>

        <label className="form-field">
          <span className="form-label">Custom links (one per line)</span>
          <textarea
            rows={2}
            value={linksText}
            onChange={(e) => setLinksText(e.target.value)}
            placeholder="https://example.com/profile"
          />
        </label>

        <label className="form-field">
          <span className="form-label">Notes</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering about this person…"
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : contact ? 'Save changes' : 'Add contact'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
