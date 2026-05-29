const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [totalBatches, activeWorkers, totalTx, weightToday, recentTx, matBreakdown, cityStats] = await Promise.all([
      db.get('SELECT COUNT(*) as c FROM batches'),
      db.get('SELECT COUNT(*) as c FROM workers WHERE active=1'),
      db.get('SELECT COUNT(*) as c FROM transactions'),
      db.get("SELECT COALESCE(SUM(total_weight),0) as w FROM batches WHERE created_at::date=CURRENT_DATE"),
      db.all('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10'),
      db.all('SELECT material, SUM(weight_kg) as kg FROM batch_materials GROUP BY material'),
      db.all('SELECT city, COUNT(*) as batches, SUM(total_weight) as weight FROM batches GROUP BY city'),
    ]);
    res.json({
      totalBatches: Number(totalBatches.c),
      activeWorkers: Number(activeWorkers.c),
      totalTx: Number(totalTx.c),
      weightToday: Number(weightToday.w),
      recentTx, matBreakdown, cityStats
    });
  } catch(e) { next(e); }
});

router.get('/recovery', async (_req, res, next) => {
  try {
    res.json(await db.all(`SELECT TO_CHAR(created_at,'YYYY-MM') as month,
                           COUNT(*) as batches, COALESCE(SUM(total_weight),0) as total_weight
                           FROM batches GROUP BY month ORDER BY month ASC LIMIT 12`));
  } catch(e) { next(e); }
});

router.get('/cities', async (_req, res, next) => {
  try {
    res.json(await db.all(`SELECT b.city, COUNT(DISTINCT b.id) as batches,
                           COALESCE(SUM(b.total_weight),0) as total_weight,
                           COUNT(DISTINCT w.id) as workers
                           FROM batches b LEFT JOIN workers w ON w.city=b.city
                           GROUP BY b.city ORDER BY total_weight DESC`));
  } catch(e) { next(e); }
});

router.get('/materials', async (_req, res, next) => {
  try {
    res.json(await db.all(`SELECT material, COUNT(*) as entries, COALESCE(SUM(weight_kg),0) as total_kg
                           FROM batch_materials GROUP BY material ORDER BY total_kg DESC`));
  } catch(e) { next(e); }
});

router.get('/workers', async (_req, res, next) => {
  try {
    res.json(await db.all(`SELECT TO_CHAR(joined_at,'YYYY-MM') as month, COUNT(*) as new_workers, role
                           FROM workers GROUP BY month, role ORDER BY month ASC`));
  } catch(e) { next(e); }
});

module.exports = router;
