const express = require('express');
const router = express.Router();
const db = require('../db');
const { genLotId, uuid } = require('../helpers');

router.get('/stats/materials', async (_req, res, next) => {
  try {
    res.json(await db.all(`SELECT material, COUNT(*) as lots, SUM(quantity_kg) as total_kg,
                           AVG(price_per_kg) as avg_price FROM lots WHERE status='available' GROUP BY material`));
  } catch(e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { material, city, grade, status = 'available', limit = 50 } = req.query;
    let sql = `SELECT l.*, w.name as seller_name, w.reputation as seller_rating
               FROM lots l JOIN workers w ON l.kabadiwala_id = w.id WHERE 1=1`;
    const params = [];
    if (status)   { params.push(status);   sql += ` AND l.status = $${params.length}`; }
    if (material) { params.push(material); sql += ` AND l.material = $${params.length}`; }
    if (city)     { params.push(city);     sql += ` AND l.city = $${params.length}`; }
    if (grade)    { params.push(grade);    sql += ` AND l.grade = $${params.length}`; }
    params.push(Number(limit));
    sql += ` ORDER BY l.created_at DESC LIMIT $${params.length}`;
    res.json(await db.all(sql, params));
  } catch(e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const lot = await db.get(`SELECT l.*, w.name as seller_name, w.reputation as seller_rating, w.phone as seller_phone
                              FROM lots l JOIN workers w ON l.kabadiwala_id = w.id WHERE l.id = $1`, [req.params.id]);
    if (!lot) return res.status(404).json({ error: 'Lot not found' });
    res.json(lot);
  } catch(e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { kabadiwala_id, material, quantity_kg, price_per_kg, grade, city } = req.body;
    if (!kabadiwala_id || !material || !quantity_kg || !price_per_kg || !grade || !city)
      return res.status(400).json({ error: 'All fields required' });
    const worker = await db.get("SELECT * FROM workers WHERE id = $1 AND role = 'kabadiwala'", [kabadiwala_id]);
    if (!worker) return res.status(404).json({ error: 'Kabadiwala not found' });
    const id = genLotId(city);
    await db.run('INSERT INTO lots (id,kabadiwala_id,material,quantity_kg,price_per_kg,grade,city) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id,kabadiwala_id,material,quantity_kg,price_per_kg,grade,city]);
    res.status(201).json(await db.get('SELECT * FROM lots WHERE id = $1', [id]));
  } catch(e) { next(e); }
});

router.post('/:id/order', async (req, res, next) => {
  try {
    const { buyer_id } = req.body;
    const lot = await db.get("SELECT * FROM lots WHERE id = $1 AND status = 'available'", [req.params.id]);
    if (!lot) return res.status(404).json({ error: 'Lot not available' });
    const buyer = await db.get("SELECT * FROM workers WHERE id = $1 AND role = 'industry'", [buyer_id]);
    if (!buyer) return res.status(404).json({ error: 'Industry buyer not found' });
    const orderId = uuid();
    await db.transaction(async (client) => {
      const q = db.clientQuery(client);
      await q.run('INSERT INTO orders (id,lot_id,buyer_id) VALUES ($1,$2,$3)', [orderId,lot.id,buyer_id]);
      await q.run("UPDATE lots SET status='reserved' WHERE id=$1", [lot.id]);
    });
    res.status(201).json({ order_id: orderId, lot_id: lot.id, status: 'pending' });
  } catch(e) { next(e); }
});

module.exports = router;
