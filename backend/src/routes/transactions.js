const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/verify/:txHash', async (req, res, next) => {
  try {
    const tx = await db.get('SELECT * FROM transactions WHERE tx_hash = $1', [req.params.txHash]);
    if (!tx) return res.status(404).json({ verified: false, error: 'Hash not found' });
    res.json({ verified: true, tx });
  } catch(e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, batch_id } = req.query;
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];
    if (batch_id) { params.push(batch_id); sql += ` AND batch_id = $${params.length}`; }
    params.push(Number(limit));
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    res.json(await db.all(sql, params));
  } catch(e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tx = await db.get('SELECT * FROM transactions WHERE id = $1', [req.params.id]);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    res.json(tx);
  } catch(e) { next(e); }
});

module.exports = router;
