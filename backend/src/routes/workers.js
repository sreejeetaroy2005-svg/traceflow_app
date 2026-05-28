const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/workers
router.get('/', (req, res) => {
  const { role, city } = req.query;
  let sql = 'SELECT * FROM workers WHERE 1=1';
  const params = [];
  if (role) { sql += ' AND role = ?'; params.push(role); }
  if (city) { sql += ' AND city = ?'; params.push(city); }
  sql += ' ORDER BY joined_at DESC';
  res.json(db.all(sql, params));
});

// GET /api/workers/stats/summary  — must be before /:id
router.get('/stats/summary', (_req, res) => {
  const byRole = db.all('SELECT role, COUNT(*) as count FROM workers GROUP BY role');
  const byCity = db.all('SELECT city, COUNT(*) as count FROM workers GROUP BY city ORDER BY count DESC');
  const total  = db.get('SELECT COUNT(*) as count FROM workers WHERE active = 1');
  res.json({ total: total.count, byRole, byCity });
});

// GET /api/workers/:id
router.get('/:id', (req, res) => {
  const worker = db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
});

// POST /api/workers
router.post('/', (req, res) => {
  const { name, role, city, phone } = req.body;
  if (!name || !role || !city) return res.status(400).json({ error: 'name, role, city required' });
  const id = `${role.slice(0,2).toUpperCase()}-${Math.floor(Math.random()*9000)+1000}`;
  db.run('INSERT INTO workers (id,name,role,city,phone) VALUES (?,?,?,?,?)', [id,name,role,city,phone||null]);
  res.status(201).json(db.get('SELECT * FROM workers WHERE id = ?', [id]));
});

// PATCH /api/workers/:id/reputation
router.patch('/:id/reputation', (req, res) => {
  const { delta } = req.body;
  const worker = db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  const newRep = Math.min(100, Math.max(0, worker.reputation + (delta || 0)));
  db.run('UPDATE workers SET reputation = ? WHERE id = ?', [newRep, req.params.id]);
  res.json({ id: req.params.id, reputation: newRep });
});

module.exports = router;
