// ----------------------------------------------------------------------------------
//  Name:    index.ts
//  Author:  Mark Casey
//
//  Purpose: Express application entry point. Wires middleware, mounts the account,
//           contact and link routers, then starts the HTTP server.
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { accountsRouter } from './routes/accounts.js';
import { contactsRouter } from './routes/contacts.js';
import { linksRouter } from './routes/links.js';

// ── Constants ──────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ══ Middleware ═════════════════════════════════════════════
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {

  res.json({ ok: true, name: 'iCulus API' });
});

// ══ Routes ═════════════════════════════════════════════════
app.use('/api/accounts', accountsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/links', linksRouter);

app.use((_req, res) => {

  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {

  console.error('[iCulus] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ══ Startup ════════════════════════════════════════════════
app.listen(PORT, () => {

  console.log(`[iCulus] API listening on http://localhost:${PORT}`);
});
