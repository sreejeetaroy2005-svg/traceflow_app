const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/dashboard', (_req, res) => {
  const totalBatches  = db.get('SELECT COUNT(*) as c FROM batches').c;
  const activeWorkers = db.get('SELECT COUNT(*) as c FROM workers WHERE active=1').c;
  const totalTx       = db.get('SELECT COUNT(*) as c FROM transactions').c;
  const weightToday   = db.get("SELECT COALESCE(SUM(total_weight),0) as w FROM batches WHERE date(created_at)=date('now')").w;
  const recentTx      = db.all('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10');
  const matBreakdown  = db.all('SELECT material, SUM(weight_kg) as kg FROM batch_materials GROUP BY material');
  const cityStats     = db.all('SELECT city, COUNT(*) as batches, SUM(total_weight) as weight FROM batches GROUP BY city');
  res.json({ totalBatches, activeWorkers, totalTx, weightToday, recentTx, matBreakdown, cityStats });
});

router.get('/recovery', (_req, res) => {
  const rows = db.all(`SELECT strftime('%Y-%m', created_at) as month,
                       COUNT(*) as batches, COALESCE(SUM(total_weight),0) as total_weight
                       FROM batches GROUP BY month ORDER BY month ASC LIMIT 12`);
  res.json(rows);
});

router.get('/cities', (_req, res) => {
  const rows = db.all(`SELECT b.city, COUNT(DISTINCT b.id) as batches,
                       COALESCE(SUM(b.total_weight),0) as total_weight,
                       COUNT(DISTINCT w.id) as workers
                       FROM batches b LEFT JOIN workers w ON w.city = b.city
                       GROUP BY b.city ORDER BY total_weight DESC`);
  res.json(rows);
});

router.get('/materials', (_req, res) => {
  const rows = db.all(`SELECT material, COUNT(*) as entries, COALESCE(SUM(weight_kg),0) as total_kg
                       FROM batch_materials GROUP BY material ORDER BY total_kg DESC`);
  res.json(rows);
});

router.get('/workers', (_req, res) => {
  const rows = db.all(`SELECT strftime('%Y-%m', joined_at) as month, COUNT(*) as new_workers, role
                       FROM workers GROUP BY month, role ORDER BY month ASC`);
  res.json(rows);
});

module.exports = router;
