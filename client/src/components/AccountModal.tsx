// ----------------------------------------------------------------------------------
//  Name:    AccountModal.tsx
//  Author:  Mark Casey
//
//  Purpose: Add/edit form for a platform account, including optional encrypted
//           credentials.
//
//  Features:
//   • AccountFormValues → interface
//   • <AccountModal />  → account form component
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { PLATFORM_PRESETS } from '../platforms';
import { api } from '../api';
import type { Account, Credentials } from '../types';

// ── Types ──────────────────────────────────────────────────
export interface AccountFormValues {
  platform:    string;
  label:       string;
  color:       string;
  icon:        string;
  credentials: Credentials;
}

interface AccountModalProps {
  account: Account | null;
  onClose: () => void;
  onSave:  (values: AccountFormValues) => Promise<void>;
}

// ══ Component ══════════════════════════════════════════════
export function AccountModal({ account, onClose, onSave }: AccountModalProps) {

  const [platform, setPlatform] = useState(account?.platform ?? 'linkedin');
  const [label, setLabel] = useState(account?.label ?? 'LinkedIn');
  const [color, setColor] = useState(account?.color ?? '#0A66C2');
  const [icon, setIcon] = useState(account?.icon ?? 'in');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    if (!account) {

      return;
    }

    let cancelled = false;

    api
      .getAccountCredentials(account.id)
      .then((res) => {

        if (cancelled || !res.credentials) {

          return;
        }

        setUsername(res.credentials.username ?? '');
        setPassword(res.credentials.password ?? '');
        setApiKey(res.credentials.apiKey ?? '');
        setToken(res.credentials.token ?? '');
      })
      .catch(() => {

        // Credentials could not be loaded; leave fields blank.
      });

    return () => {

      cancelled = true;
    };
  }, [account]);

  const handlePlatformChange = (key: string) => {

    setPlatform(key);

    const preset = PLATFORM_PRESETS.find((p) => p.key === key);

    if (preset) {

      setLabel(preset.label);
      setColor(preset.color);
      setIcon(preset.icon);
    }
  };

  const handleSubmit = async (event: FormEvent) => {

    event.preventDefault();

    if (!platform.trim() || !label.trim()) {

      setError('Platform and label are required.');
      return;
    }

    setSaving(true);
    setError(null);

    const credentials: Credentials = {};

    if (username.trim()) {

      credentials.username = username.trim();
    }

    if (password) {

      credentials.password = password;
    }

    if (apiKey.trim()) {

      credentials.apiKey = apiKey.trim();
    }

    if (token) {

      credentials.token = token;
    }

    try {

      await onSave({
        platform: platform.trim(),
        label: label.trim(),
        color,
        icon: icon.trim() || label.trim().charAt(0).toUpperCase(),
        credentials,
      });

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to save account');
      setSaving(false);
    }
  };

  return (
    <Modal title={account ? 'Edit account' : 'Add account'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label className="form-field">
            <span className="form-label">Platform</span>
            <select value={platform} onChange={(e) => handlePlatformChange(e.target.value)}>
              {PLATFORM_PRESETS.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-label">Display name</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="LinkedIn" />
          </label>
        </div>

        <div className="form-row">
          <label className="form-field">
            <span className="form-label">Accent color</span>
            <div className="color-input">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              <input value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </label>
          <label className="form-field">
            <span className="form-label">Icon (text)</span>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="in" />
          </label>
        </div>

        <div className="form-section">
          <div className="form-section-head">
            <span className="form-section-title">Credentials (optional)</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSecrets((v) => !v)}>
              {showSecrets ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="form-hint">
            Stored encrypted with AES-256-GCM and only read back on your device.
          </p>
          <div className="form-row">
            <label className="form-field">
              <span className="form-label">Username / email</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
            </label>
            <label className="form-field">
              <span className="form-label">Password</span>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
          </div>
          <div className="form-row">
            <label className="form-field">
              <span className="form-label">API key</span>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="form-field">
              <span className="form-label">Token</span>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : account ? 'Save changes' : 'Add account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
