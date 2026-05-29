const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/stats/summary', async (_req, res, next) => {
  try {
    const byRole = await db.all('SELECT role, COUNT(*) as count FROM workers GROUP BY role');
    const byCity = await db.all('SELECT city, COUNT(*) as count FROM workers GROUP BY city ORDER BY count DESC');
    const total  = await db.get('SELECT COUNT(*) as count FROM workers WHERE active = 1');
    res.json({ total: Number(total.count), byRole, byCity });
  } catch(e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { role, city } = req.query;
    let sql = 'SELECT * FROM workers WHERE 1=1';
    const params = [];
    if (role) { params.push(role); sql += ` AND role = $${params.length}`; }
    if (city) { params.push(city); sql += ` AND city = $${params.length}`; }
    sql += ' ORDER BY joined_at DESC';
    res.json(await db.all(sql, params));
  } catch(e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const w = await db.get('SELECT * FROM workers WHERE id = $1', [req.params.id]);
    if (!w) return res.status(404).json({ error: 'Worker not found' });
    res.json(w);
  } catch(e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, role, city, phone } = req.body;
    if (!name || !role || !city) return res.status(400).json({ error: 'name, role, city required' });
    const id = `${role.slice(0,2).toUpperCase()}-${Math.floor(Math.random()*9000)+1000}`;
    await db.run('INSERT INTO workers (id,name,role,city,phone) VALUES ($1,$2,$3,$4,$5)', [id,name,role,city,phone||null]);
    res.status(201).json(await db.get('SELECT * FROM workers WHERE id = $1', [id]));
  } catch(e) { next(e); }
});

router.patch('/:id/reputation', async (req, res, next) => {
  try {
    const { delta } = req.body;
    const w = await db.get('SELECT * FROM workers WHERE id = $1', [req.params.id]);
    if (!w) return res.status(404).json({ error: 'Worker not found' });
    const newRep = Math.min(100, Math.max(0, w.reputation + (delta || 0)));
    await db.run('UPDATE workers SET reputation = $1 WHERE id = $2', [newRep, req.params.id]);
    res.json({ id: req.params.id, reputation: newRep });
  } catch(e) { next(e); }
});

module.exports = router;
