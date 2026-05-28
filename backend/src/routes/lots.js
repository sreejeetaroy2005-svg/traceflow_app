const express = require('express');
const router = express.Router();
const db = require('../db');
const { genLotId, uuid } = require('../helpers');

// GET /api/lots/stats/materials — must be before /:id
router.get('/stats/materials', (_req, res) => {
  const rows = db.all(`SELECT material, COUNT(*) as lots, SUM(quantity_kg) as total_kg,
                       AVG(price_per_kg) as avg_price FROM lots WHERE status='available' GROUP BY material`);
  res.json(rows);
});

// GET /api/lots
router.get('/', (req, res) => {
  const { material, city, grade, status = 'available', limit = 50 } = req.query;
  let sql = `SELECT l.*, w.name as seller_name, w.reputation as seller_rating
             FROM lots l JOIN workers w ON l.kabadiwala_id = w.id WHERE 1=1`;
  const params = [];
  if (status)   { sql += ' AND l.status = ?';   params.push(status); }
  if (material) { sql += ' AND l.material = ?'; params.push(material); }
  if (city)     { sql += ' AND l.city = ?';     params.push(city); }
  if (grade)    { sql += ' AND l.grade = ?';    params.push(grade); }
  sql += ' ORDER BY l.created_at DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.all(sql, params));
});

// GET /api/lots/:id
router.get('/:id', (req, res) => {
  const lot = db.get(`SELECT l.*, w.name as seller_name, w.reputation as seller_rating, w.phone as seller_phone
                      FROM lots l JOIN workers w ON l.kabadiwala_id = w.id WHERE l.id = ?`, [req.params.id]);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });
  res.json(lot);
});

// POST /api/lots
router.post('/', (req, res) => {
  const { kabadiwala_id, material, quantity_kg, price_per_kg, grade, city } = req.body;
  if (!kabadiwala_id || !material || !quantity_kg || !price_per_kg || !grade || !city) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const worker = db.get("SELECT * FROM workers WHERE id = ? AND role = 'kabadiwala'", [kabadiwala_id]);
  if (!worker) return res.status(404).json({ error: 'Kabadiwala not found' });

  const id = genLotId(city);
  db.run('INSERT INTO lots (id,kabadiwala_id,material,quantity_kg,price_per_kg,grade,city) VALUES (?,?,?,?,?,?,?)',
    [id, kabadiwala_id, material, quantity_kg, price_per_kg, grade, city]);
  res.status(201).json(db.get('SELECT * FROM lots WHERE id = ?', [id]));
});

// POST /api/lots/:id/order
router.post('/:id/order', (req, res) => {
  const { buyer_id } = req.body;
  const lot = db.get("SELECT * FROM lots WHERE id = ? AND status = 'available'", [req.params.id]);
  if (!lot) return res.status(404).json({ error: 'Lot not available' });
  const buyer = db.get("SELECT * FROM workers WHERE id = ? AND role = 'industry'", [buyer_id]);
  if (!buyer) return res.status(404).json({ error: 'Industry buyer not found' });

  const orderId = uuid();
  db.transaction(() => {
    db.run('INSERT INTO orders (id,lot_id,buyer_id) VALUES (?,?,?)', [orderId, lot.id, buyer_id]);
    db.run("UPDATE lots SET status = 'reserved' WHERE id = ?", [lot.id]);
  });

  res.status(201).json({ order_id: orderId, lot_id: lot.id, status: 'pending' });
});

module.exports = router;
