#!/usr/bin/env node
// One-off maintenance script: clears the games + moves tables so TypeORM
// schema synchronize can apply NOT NULL relation columns on an empty table.
// Run via Render Pre-Deploy Command: `node scripts/db-reset-games.js`
// Safe to remove after a successful deploy. Users/ratings are NOT touched.

const { Client } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[db-reset] DATABASE_URL is not set — skipping');
  process.exit(0);
}

(async () => {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    console.log('[db-reset] Connected. Truncating moves + games...');
    await client.query('TRUNCATE TABLE moves, games RESTART IDENTITY CASCADE');
    console.log('[db-reset] Done. games + moves cleared.');
  } catch (err) {
    console.error('[db-reset] Failed:', err.message);
    // Do not block deploy if tables do not exist yet
  } finally {
    await client.end().catch(() => {});
  }
})();
