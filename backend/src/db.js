const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ── SCHEMA ────────────────────────────────────────────────────────────────────
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workers (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL,
      city        TEXT NOT NULL,
      phone       TEXT,
      reputation  INTEGER DEFAULT 80,
      joined_at   TIMESTAMPTZ DEFAULT NOW(),
      active      INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS batches (
      id            TEXT PRIMARY KEY,
      city          TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'generated',
      total_weight  REAL DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS batch_materials (
      id          SERIAL PRIMARY KEY,
      batch_id    TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      material    TEXT NOT NULL,
      weight_kg   REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id            TEXT PRIMARY KEY,
      batch_id      TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      from_actor    TEXT,
      to_actor      TEXT NOT NULL,
      stage         TEXT NOT NULL,
      weight_kg     REAL,
      location      TEXT,
      tx_hash       TEXT NOT NULL,
      block_number  INTEGER,
      gas_used      INTEGER,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lots (
      id            TEXT PRIMARY KEY,
      kabadiwala_id TEXT NOT NULL REFERENCES workers(id),
      material      TEXT NOT NULL,
      quantity_kg   REAL NOT NULL,
      price_per_kg  REAL NOT NULL,
      grade         TEXT NOT NULL,
      city          TEXT NOT NULL,
      status        TEXT DEFAULT 'available',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id          TEXT PRIMARY KEY,
      lot_id      TEXT NOT NULL REFERENCES lots(id),
      buyer_id    TEXT NOT NULL REFERENCES workers(id),
      status      TEXT DEFAULT 'pending',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
    CREATE INDEX IF NOT EXISTS idx_batches_city   ON batches(city);
    CREATE INDEX IF NOT EXISTS idx_tx_batch       ON transactions(batch_id);
    CREATE INDEX IF NOT EXISTS idx_lots_status    ON lots(status);
  `);
  console.log('✓ DB schema ready');
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

// Returns all rows for a query
async function all(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

// Returns first row or null
async function get(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

// Runs a write query, returns result
async function run(sql, params = []) {
  const result = await pool.query(sql, params);
  return result;
}

// Runs multiple queries in a transaction
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Thin wrapper so transaction callbacks can use same all/get/run API
function clientQuery(client) {
  return {
    run: (sql, params) => client.query(sql, params),
    get: async (sql, params) => { const { rows } = await client.query(sql, params); return rows[0] || null; },
    all: async (sql, params) => { const { rows } = await client.query(sql, params); return rows; },
  };
}

module.exports = { initDb, all, get, run, transaction, clientQuery, pool };
