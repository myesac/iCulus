// ----------------------------------------------------------------------------------
//  Name:    paths.ts
//  Author:  Mark Casey
//
//  Purpose: Central path constants for the iCulus data directory, database file,
//           and master key file.
//
//  Exported API:
//   • SERVER_ROOT → string (absolute path to the server package)
//   • DATA_DIR    → string (absolute path to the data directory)
//   • DB_PATH     → string (absolute path to the SQLite database)
//   • KEY_PATH    → string (absolute path to the master key file)
// ----------------------------------------------------------------------------------
// ── Imports ────────────────────────────────────────────────
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ══ Paths ══════════════════════════════════════════════════
// When run with tsx, import.meta.url points at this source file under src/.
export const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR    = join(SERVER_ROOT, 'data');
export const DB_PATH     = join(DATA_DIR, 'iculus.db');
export const KEY_PATH    = join(DATA_DIR, 'master.key');
