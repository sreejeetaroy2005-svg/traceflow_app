const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/traceflow.db');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let _db = null;

// sql.js is async to init, so we expose a promise and a sync accessor
// We initialise once at startup and persist to disk on every write
let _ready = null;

function getDb() {
  if (!_db) throw new Error('DB not initialised — call initDb() first');
  return _db;
}

async function initDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }
  _db.run('PRAGMA foreign_keys = ON;');
  createSchema();
  persist();
  return _db;
}

function persist() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function createSchema() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS workers (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL,
      city        TEXT NOT NULL,
      phone       TEXT,
      reputation  INTEGER DEFAULT 80,
      joined_at   TEXT DEFAULT (datetime('now')),
      active      INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS batches (
      id            TEXT PRIMARY KEY,
      city          TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'generated',
      total_weight  REAL DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS batch_materials (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id    TEXT NOT NULL,
      material    TEXT NOT NULL,
      weight_kg   REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id            TEXT PRIMARY KEY,
      batch_id      TEXT NOT NULL,
      from_actor    TEXT,
      to_actor      TEXT NOT NULL,
      stage         TEXT NOT NULL,
      weight_kg     REAL,
      location      TEXT,
      tx_hash       TEXT NOT NULL,
      block_number  INTEGER,
      gas_used      INTEGER,
      created_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS lots (
      id            TEXT PRIMARY KEY,
      kabadiwala_id TEXT NOT NULL,
      material      TEXT NOT NULL,
      quantity_kg   REAL NOT NULL,
      price_per_kg  REAL NOT NULL,
      grade         TEXT NOT NULL,
      city          TEXT NOT NULL,
      status        TEXT DEFAULT 'available',
      created_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id          TEXT PRIMARY KEY,
      lot_id      TEXT NOT NULL,
      buyer_id    TEXT NOT NULL,
      status      TEXT DEFAULT 'pending',
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);
}

// Helper: run a query and return all rows as objects
function all(sql, params = []) {
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Helper: run a query and return first row
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

// Helper: run a write query, persist to disk
function run(sql, params = []) {
  _db.run(sql, params);
  persist();
}

// Helper: run multiple statements in a transaction
function transaction(fn) {
  _db.run('BEGIN');
  try {
    fn();
    _db.run('COMMIT');
    persist();
  } catch (e) {
    _db.run('ROLLBACK');
    throw e;
  }
}

module.exports = { initDb, getDb, all, get, run, transaction, persist };
