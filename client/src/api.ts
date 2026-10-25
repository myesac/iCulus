// ----------------------------------------------------------------------------------
//  Name:    api.ts
//  Author:  Mark Casey
//
//  Purpose: Typed client for the iCulus REST API. Wraps fetch and exposes one
//           method per endpoint.
//
//  Features:
//   • request<T>(path, options) → Promise<T>
//   • api                       → object of endpoint helpers
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import type { Account, Contact, ContactLink, ContactPayload, Credentials } from './types';

// ══ Request helper ═════════════════════════════════════════
async function request<T>(path: string, options?: RequestInit): Promise<T> {

  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {

    let message = `Request failed (${res.status})`;

    try {

      const body = (await res.json()) as { error?: string };

      if (body.error) {

        message = body.error;
      }

    } catch {

      // Non-JSON error body; keep the generic message.
    }

    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

export const api = {
  getAccounts: () => request<Account[]>('/api/accounts'),
  getAccountCredentials: (id: string) =>
    request<{ credentials: Credentials | null }>(`/api/accounts/${id}/credentials`),
  createAccount: (data: {
    platform: string;
    label: string;
    color: string;
    icon: string;
    credentials?: Credentials;
  }) => request<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (
    id: string,
    data: {
      platform: string;
      label: string;
      color: string;
      icon: string;
      credentials?: Credentials;
    },
  ) => request<Account>(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: string) =>
    request<{ ok: boolean }>(`/api/accounts/${id}`, { method: 'DELETE' }),

  getContacts: () => request<Contact[]>('/api/contacts'),
  createContact: (data: ContactPayload) =>
    request<Contact>('/api/contacts', { method: 'POST', body: JSON.stringify(data) }),
  updateContact: (id: string, data: ContactPayload) =>
    request<Contact>(`/api/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContact: (id: string) =>
    request<{ ok: boolean }>(`/api/contacts/${id}`, { method: 'DELETE' }),

  getLinks: () => request<ContactLink[]>('/api/links'),
  createLink: (sourceId: string, targetId: string) =>
    request<ContactLink>('/api/links', {
      method: 'POST',
      body: JSON.stringify({ sourceId, targetId }),
    }),
  deleteLink: (id: string) => request<{ ok: boolean }>(`/api/links/${id}`, { method: 'DELETE' }),
  rescanLinks: () => request<ContactLink[]>('/api/links/rescan', { method: 'POST' }),
};
