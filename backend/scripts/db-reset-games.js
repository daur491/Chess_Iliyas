#!/usr/bin/env node
// One-off maintenance script: clears tables whose FK relation column was
// renamed, so TypeORM schema synchronize can apply NOT NULL relation columns
// on empty tables. Run via Render Pre-Deploy Command:
//   node scripts/db-reset-games.js
// Safe to remove after a successful deploy. The `users` table is NOT touched
// (ratings/accounts are preserved).

const { Client } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[db-reset] DATABASE_URL is not set — skipping');
  process.exit(0);
}

// Tables affected by the @JoinColumn rename. Each must be cleared because old
// rows have NULL in the newly-named FK columns. Order doesn't matter — CASCADE
// handles dependencies. Truncate each independently so a missing table doesn't
// abort the rest.
const TABLES = [
  'moves',
  'games',
  'achievements',
  'puzzle_attempts',
  'tournament_participants',
  'tournaments',
];

(async () => {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    console.log('[db-reset] Connected.');
    for (const table of TABLES) {
      try {
        await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
        console.log(`[db-reset] Cleared: ${table}`);
      } catch (e) {
        console.log(`[db-reset] Skip ${table}: ${e.message}`);
      }
    }
    console.log('[db-reset] Done.');
  } catch (err) {
    console.error('[db-reset] Failed:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
})();
