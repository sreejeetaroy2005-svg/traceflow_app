const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/transactions/verify/:txHash — must be before /:id
router.get('/verify/:txHash', (req, res) => {
  const tx = db.get('SELECT * FROM transactions WHERE tx_hash = ?', [req.params.txHash]);
  if (!tx) return res.status(404).json({ verified: false, error: 'Hash not found' });
  res.json({ verified: true, tx });
});

// GET /api/transactions
router.get('/', (req, res) => {
  const { limit = 20, batch_id } = req.query;
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (batch_id) { sql += ' AND batch_id = ?'; params.push(batch_id); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.all(sql, params));
});

// GET /api/transactions/:id
router.get('/:id', (req, res) => {
  const tx = db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});

module.exports = router;
