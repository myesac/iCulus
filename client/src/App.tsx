// ----------------------------------------------------------------------------------
//  Name:    App.tsx
//  Author:  Mark Casey
//
//  Purpose: Root of the iCulus client. Manages account, contact and link state,
//           routes data to the graph, sidebar and card, and owns modal lifecycles.
//
//  Features:
//   • <App /> → root component (theme provider + app gate)
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { GraphView } from './components/GraphView';
import { NodeCard } from './components/NodeCard';
import { AccountModal, type AccountFormValues } from './components/AccountModal';
import { ContactModal, type ContactFormValues } from './components/ContactModal';
import { LinkModal } from './components/LinkModal';
import { api } from './api';
import { ThemeProvider } from './theme';
import type { Account, Contact, ContactLink, LayoutKind } from './types';

// ══ Root component ═════════════════════════════════════════
export default function App() {

  return (
    <ThemeProvider>
      <AppGate />
    </ThemeProvider>
  );
}

// ══ Splash gate ════════════════════════════════════════════
function AppGate() {

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {

    const timer = window.setTimeout(() => setShowSplash(false), 3_200);

    return () => window.clearTimeout(timer);
  }, []);

  return showSplash ? <SplashScreen /> : <MainApp />;
}

// ══ Main app ═══════════════════════════════════════════════
function MainApp() {

  // ── State ────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [links, setLinks] = useState<ContactLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutKind>('force');

  const [accountModal, setAccountModal] = useState<{ open: boolean; account: Account | null }>({
    open: false,
    account: null,
  });
  const [contactModal, setContactModal] = useState<{
    open: boolean;
    accountId: string | null;
    contact: Contact | null;
  }>({ open: false, accountId: null, contact: null });
  const [linkModalSource, setLinkModalSource] = useState<Contact | null>(null);

  // ── Data loading ─────────────────────────────────────────
  const loadData = useCallback(async () => {

    try {

      const [loadedAccounts, loadedContacts, loadedLinks] = await Promise.all([
        api.getAccounts(),
        api.getContacts(),
        api.getLinks(),
      ]);

      setAccounts(loadedAccounts);
      setContacts(loadedContacts);
      setLinks(loadedLinks);
      setError(null);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to load data');

    } finally {

      setLoading(false);
    }
  }, []);

  useEffect(() => {

    void loadData();
  }, [loadData]);

  const reloadLinks = useCallback(async () => {

    try {

      setLinks(await api.getLinks());

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to refresh links');
    }
  }, []);

  // ── Derived state ────────────────────────────────────────
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedMainId) ?? null,
    [accounts, selectedMainId],
  );
  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedSubId) ?? null,
    [contacts, selectedSubId],
  );

  // ── Handlers ─────────────────────────────────────────────
  const handleSelectMain = (id: string) => {

    setSelectedMainId((prev) => (prev === id ? null : id));
    setSelectedSubId(null);
  };

  const handleSelectSub = (id: string) => {

    setSelectedSubId((prev) => (prev === id ? null : id));
  };

  const handleClearSelection = () => {

    setSelectedMainId(null);
    setSelectedSubId(null);
  };

  const handleSaveAccount = async (values: AccountFormValues) => {

    const current = accountModal.account;

    if (current) {

      const updated = await api.updateAccount(current.id, values);
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

    } else {

      const created = await api.createAccount(values);
      setAccounts((prev) => [...prev, created]);
      setSelectedMainId(created.id);
      setSelectedSubId(null);
    }

    setAccountModal({ open: false, account: null });
  };

  const handleDeleteAccount = async (id: string) => {

    if (!window.confirm('Delete this account and all of its contacts?')) {

      return;
    }

    await api.deleteAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setContacts((prev) => prev.filter((c) => c.accountId !== id));

    if (selectedMainId === id) {

      setSelectedMainId(null);
      setSelectedSubId(null);
    }

    await reloadLinks();
  };

  const handleSaveContact = async (values: ContactFormValues) => {

    const current = contactModal.contact;

    if (current) {

      const updated = await api.updateContact(current.id, values);
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

    } else if (contactModal.accountId) {

      const created = await api.createContact({ ...values, accountId: contactModal.accountId });
      setContacts((prev) => [...prev, created]);
      setSelectedSubId(created.id);
    }

    setContactModal({ open: false, accountId: null, contact: null });

    await reloadLinks();
  };

  const handleDeleteContact = async (id: string) => {

    if (!window.confirm('Delete this contact?')) {

      return;
    }

    await api.deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));

    if (selectedSubId === id) {

      setSelectedSubId(null);
    }

    await reloadLinks();
  };

  const handleLink = async (targetId: string) => {

    if (!linkModalSource) {

      return;
    }

    await api.createLink(linkModalSource.id, targetId);
    setLinkModalSource(null);

    await reloadLinks();
  };

  const handleUnlink = async (linkId: string) => {

    await api.deleteLink(linkId);

    await reloadLinks();
  };

  const handleRescan = async () => {

    try {

      setLinks(await api.rescanLinks());

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to rescan links');
    }
  };

  const linkedIdsForSource = useMemo(() => {

    if (!linkModalSource) {

      return [];
    }

    return links
      .filter((l) => l.sourceId === linkModalSource.id || l.targetId === linkModalSource.id)
      .map((l) => (l.sourceId === linkModalSource.id ? l.targetId : l.sourceId));
  }, [linkModalSource, links]);

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="app-shell">
      <TopBar layout={layout} onLayoutChange={setLayout} onRescanLinks={handleRescan} />

      <div className="app-body">
        <Sidebar
          accounts={accounts}
          contacts={contacts}
          selectedMainId={selectedMainId}
          onSelect={handleSelectMain}
          onAddAccount={() => setAccountModal({ open: true, account: null })}
        />

        <main className="app-main">
          {loading ? (
            <div className="app-status">
              <span className="spinner" />
              Loading your network…
            </div>
          ) : (
            <GraphView
              accounts={accounts}
              contacts={contacts}
              links={links}
              selectedMainId={selectedMainId}
              selectedSubId={selectedSubId}
              layout={layout}
              onSelectMain={handleSelectMain}
              onSelectSub={handleSelectSub}
              onClearSelection={handleClearSelection}
              onAddAccount={() => setAccountModal({ open: true, account: null })}
              onAddContact={(accountId) => setContactModal({ open: true, accountId, contact: null })}
            />
          )}
          {error && accounts.length > 0 && <div className="app-toast">{error}</div>}
        </main>

        <NodeCard
          account={selectedAccount}
          contact={selectedContact}
          accounts={accounts}
          contacts={contacts}
          links={links}
          onClose={handleClearSelection}
          onEditAccount={(account) => setAccountModal({ open: true, account })}
          onEditContact={(contact) =>
            setContactModal({ open: true, accountId: contact.accountId, contact })
          }
          onDeleteAccount={handleDeleteAccount}
          onDeleteContact={handleDeleteContact}
          onAddContact={(accountId) => setContactModal({ open: true, accountId, contact: null })}
          onLinkContact={(contact) => setLinkModalSource(contact)}
          onUnlink={handleUnlink}
        />
      </div>

      {accountModal.open && (
        <AccountModal
          account={accountModal.account}
          onClose={() => setAccountModal({ open: false, account: null })}
          onSave={handleSaveAccount}
        />
      )}

      {contactModal.open && contactModal.accountId && (
        <ContactModal
          contact={contactModal.contact}
          onClose={() => setContactModal({ open: false, accountId: null, contact: null })}
          onSave={handleSaveContact}
        />
      )}

      {linkModalSource && (
        <LinkModal
          source={linkModalSource}
          contacts={contacts}
          accounts={accounts}
          excludedIds={linkedIdsForSource}
          onClose={() => setLinkModalSource(null)}
          onLink={handleLink}
        />
      )}
    </div>
  );
}
