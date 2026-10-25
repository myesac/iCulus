# iCulus — Architecture

A personal contact/account hub that links people across LinkedIn, Outlook, Gmail, WhatsApp, Facebook, X, Instagram and other platforms into one navigable, Obsidian-style graph of "bubbles".

## 1. High-level architecture

```
┌───────────────────────────────┐        ┌───────────────────────────────┐
│  client/  (browser)           │        │  server/  (Node.js)           │
│  React 19 + Vite + TypeScript │  /api  │  Express 5 + TypeScript       │
│                               │ ─────► │                               │
│  Splash screen                │  JSON  │  REST routes (accounts,       │
│  Graph view (SVG + d3-force)  │ ◄───── │  contacts, links)             │
│  Node card / modals / theme   │        │  node:sqlite (SQLite)         │
│                               │        │  AES-256-GCM credential store │
└───────────────────────────────┘        └───────────────┬───────────────┘
                                                         │
                                                    server/data/
                                                 iculus.db  master.key
```

- The browser talks to the API only through `fetch` calls under `/api`.
- Vite proxies `/api` → `http://localhost:3001` in development, so there is a single origin from the browser's perspective.
- The server is the only component that touches the database or the master key.

## 2. Technology stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend framework | React 19 + TypeScript + Vite | Fast HMR, strict typing |
| Graph rendering | Custom SVG renderer on `d3-force` | Full control over the "bubble" look, edges, and drag |
| Backend | Express 5 + TypeScript (run with `tsx`) | Simple REST API, no build step needed for dev |
| Database | `node:sqlite` (built into Node 24) | Zero native compilation on any platform |
| Secrets | AES-256-GCM via `node:crypto` | Credentials encrypted at rest |

## 3. Repository layout

```
iculus/
├── package.json            # npm workspaces: ["client", "server"], scripts
├── client/
│   ├── index.html          # theme bootstrap + font preloads
│   └── src/
│       ├── App.tsx         # splash gate + MainApp state & data flow
│       ├── api.ts          # typed fetch wrapper over /api
│       ├── types.ts        # shared client types (Account, Contact, Link)
│       ├── theme.tsx       # ThemeProvider + useTheme (light/dark)
│       ├── platforms.ts    # platform presets (name, icon, color)
│       ├── graph/
│       │   ├── layout.ts           # static layouts + force seed positions
│       │   └── useForceLayout.ts   # d3-force simulation hook
│       └── components/
│           ├── SplashScreen.tsx    # 8-bit CRT splash (≥3s)
│           ├── TopBar.tsx          # layout switcher, rescan, theme toggle
│           ├── Sidebar.tsx         # account list
│           ├── GraphView.tsx       # SVG graph: nodes, edges, drag, expand
│           ├── NodeCard.tsx        # account/contact info card
│           ├── AccountModal.tsx    # add/edit account + credentials
│           ├── ContactModal.tsx    # add/edit contact
│           ├── LinkModal.tsx       # manual linking search
│           └── Modal.tsx           # shared modal shell
└── server/
    └── src/
        ├── index.ts        # Express app + route mounting
        ├── db.ts           # schema + connection (node:sqlite)
        ├── crypto.ts       # AES-256-GCM encrypt/decrypt + key management
        ├── autolink.ts     # cross-account contact matching
        ├── paths.ts        # data/DB/key file locations
        ├── types.ts        # server types
        └── routes/
            ├── accounts.ts # /api/accounts
            ├── contacts.ts # /api/contacts
            └── links.ts    # /api/links
```

## 4. Data model

SQLite tables (created idempotently in `server/src/db.ts`):

### `accounts`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `platform` | TEXT | key, e.g. `linkedin`, `gmail` |
| `label` | TEXT | display name |
| `color` | TEXT | accent hex for bubbles |
| `icon` | TEXT | short glyph rendered on the bubble |
| `credentials_enc` | TEXT NULL | AES-256-GCM encrypted JSON |
| `created_at` / `updated_at` | TEXT | ISO timestamps |

### `contacts`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `account_id` | TEXT FK → accounts, ON DELETE CASCADE | owning platform |
| `full_name` | TEXT | required |
| `handle`, `email`, `phone`, `avatar_url`, `company`, `title`, `location`, `notes` | TEXT NULL | optional fields |
| `tags`, `custom_links` | TEXT | JSON arrays |
| `created_at` / `updated_at` | TEXT | ISO timestamps |

### `links`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `source_id`, `target_id` | TEXT FK → contacts, ON DELETE CASCADE | always cross-account |
| `kind` | TEXT | `auto` or `manual` |
| `confidence` | REAL | 0–1, used for auto links |
| `created_at` | TEXT | ISO timestamp |

Indexes exist on `contacts.account_id`, `contacts.email`, `contacts.phone`, and both link endpoints.

## 5. API surface

Base URL: `/api` (dev proxy at `http://localhost:5173`, server on `:3001`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | liveness check |
| GET | `/accounts` | list accounts (credentials masked as `hasCredentials`) |
| GET | `/accounts/:id` | single account |
| GET | `/accounts/:id/credentials` | decrypt + return stored credentials (explicit read) |
| POST | `/accounts` | create account; encrypts credentials if present |
| PUT | `/accounts/:id` | update; replaces credentials only when provided |
| DELETE | `/accounts/:id` | cascade deletes contacts and their links |
| GET | `/contacts` | list contacts (`?accountId=` optional) |
| GET | `/contacts/:id` | single contact |
| POST | `/contacts` | create contact, then runs auto-link scan |
| PUT | `/contacts/:id` | update contact, then runs auto-link scan |
| DELETE | `/contacts/:id` | delete contact, then runs auto-link scan |
| GET | `/links` | list links |
| POST | `/links` | create a manual link (validates cross-account + no duplicate) |
| DELETE | `/links/:id` | remove a link |
| POST | `/links/rescan` | rebuild all auto links |

## 6. Credential encryption

- Sensitive data is stored as `v1:<iv>:<tag>:<ciphertext>` (base64), produced by AES-256-GCM.
- The 256-bit master key is generated on first boot at `server/data/master.key` and read on subsequent boots.
- `server/data/` is gitignored. **The master key must be backed up and protected** — losing it makes existing credentials unreadable; anyone with it plus the database can decrypt secrets.
- Credentials are only returned to the client on the explicit `GET /accounts/:id/credentials` call, and never in list responses.

## 7. Auto-linking

`server/src/autolink.ts` rebuilds auto links from scratch on every contact mutation:

1. Deletes all `kind = 'auto'` links (manual links are never touched).
2. Compares every cross-account contact pair and computes the strongest match:
   - **email** (normalized, exact) → confidence `1.0`
   - **phone** (digits only, ≥7 digits, exact) → confidence `0.95`
   - **full name** (lowercased, punctuation-stripped, whitespace-collapsed) → confidence `0.75`
3. Skips pairs that already have a manual link to avoid duplicates.
4. Inserts new auto links with the computed confidence.

## 8. Frontend architecture

### 8.1 State ownership (`App.tsx`)
`MainApp` owns the single source of truth:

- `accounts`, `contacts`, `links` — loaded once on mount, updated by CRUD handlers.
- `selectedMainId` / `selectedSubId` — the currently expanded account and selected contact.
- `layout` — one of `force | circle | hex | spiral | groups`.
- Modal state — account modal, contact modal, link modal.

Data flows down via props; mutations call the API, update local state, and re-fetch links when a contact changes (because auto-links may have changed server-side).

### 8.2 Graph rendering (`GraphView.tsx` + `graph/`)
- **Main nodes** are accounts (large colored bubbles with icon + label); **sub-nodes** are the contacts of the selected account (smaller bubbles with initials).
- Only one account's sub-nodes are visible at a time — selecting a main node expands it; selecting it again (or selecting another) collapses it.
- **Positions**: static layouts are computed deterministically in `layout.ts`; the force layout runs a `d3-force` simulation in `useForceLayout.ts` (charge + collision + centering + links), seeded from the circle layout.
- **Edges**:
  - Collapsed view: faint dashed lines between main nodes whose contacts are linked anywhere.
  - Expanded view: each visible contact's links are drawn from the contact bubble to the *other account's* main bubble (auto = dashed, manual = solid).
- **Interaction**: pointer-drag moves nodes (pinning `fx`/`fy` during force simulation); a move-suppression guard distinguishes drags from clicks; a `+` badge on the selected main node opens the contact form.
- **Highlighting**: the selected main node and its sub-nodes are highlighted; all other main nodes lowlight when an account is selected; the selected sub-node gets a glow ring.

### 8.3 Theming
`theme.tsx` persists `light`/`dark` in `localStorage` and sets `data-theme` on `<html>`. All colors are CSS custom properties defined in `index.css` for both themes, so the graph, cards, and modals theme automatically.

### 8.4 Splash screen
`SplashScreen.tsx` + `splash.css` render an 8-bit CRT title card ("Press Start 2P" font, scanlines, flicker, typed boot line) for ~3.2 seconds before `AppGate` swaps to `MainApp`.

## 9. Key flows

**Add an account**
1. `AccountModal` collects platform preset + label/color/icon + optional credentials.
2. `POST /api/accounts` encrypts credentials and inserts the row.
3. Client prepends the account and selects it.

**Add a contact**
1. `ContactModal` collects the contact fields.
2. `POST /api/contacts` inserts the row and runs the auto-link scan.
3. Client appends the contact, selects it, and re-fetches links.

**Link two contacts manually**
1. From a contact card, `LinkModal` searches contacts in other accounts.
2. `POST /api/links` validates and inserts a manual link.

**Rescan**
- `POST /api/links/rescan` rebuilds auto links; the client replaces its `links` state.

## 10. Running

```bash
npm install
npm run dev      # API (:3001) + web (:5173) concurrently
npm run build    # type-check + build the client
npm run typecheck # server type-check + client build
```

## 11. Verification

- Server type-checks with `tsc --noEmit`; client type-checks and builds with `tsc -b && vite build`.
- API flows (CRUD, encrypted credential round-trip, auto-linking, cascade deletes) were exercised with `curl`/`Invoke-RestMethod`.
- The UI was exercised end-to-end in a browser: splash → add account → add contact → cross-platform auto-link → card display.

## 12. Future work

- **Real API sync** — OAuth flows and provider adapters for LinkedIn, Gmail, Outlook, etc. The credential store is already in place for tokens.
- **Server-side full-file encryption** — field-level encryption today; SQLCipher or an encrypted volume would encrypt the whole database.
- **Node search / filters** — scale beyond the current single-account expansion.
- **Export/import** — portable backups of accounts, contacts, and links.
