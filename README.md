# iCulus

A personal contact/account hub that links your people across LinkedIn, Outlook, Gmail, WhatsApp, Facebook, X, Instagram and any other platform into one navigable, Obsidian-style graph of "bubbles".

## Stack

- **Client** — React 19 + TypeScript + Vite, custom SVG force/graph renderer (d3-force).
- **Server** — Node.js + Express 5, SQLite via the built-in `node:sqlite` module.
- **Security** — Credentials / API keys are encrypted at rest with AES-256-GCM. The master key is generated on first run at `server/data/master.key` (gitignored). Treat that file like a password — anyone with it and the database can read your secrets.

## Getting started

```bash
npm install
npm run dev
```

- API: http://localhost:3001
- Web: http://localhost:5173 (Vite proxies `/api` to the API)

## Scripts

| Command            | What it does                                   |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Run API + web concurrently (watch mode)        |
| `npm run build`    | Type-check + build the client                   |
| `npm run typecheck`| Type-check server + build client                |

## How it works

1. Add accounts (LinkedIn, Gmail, …) with optional credentials/API keys. Secrets are encrypted before hitting the database.
2. Add contacts under each account.
3. iCulus auto-detects the same person across platforms (matching email, phone, or full name) and draws links between them. You can also link contacts manually.
4. Select a main node to expand its sub-nodes; links to other platforms point at the other account's bubble. Select a node to open its card.
5. Switch layouts (Force / Circle / Hex / Spiral / Groups) from the top bar.
