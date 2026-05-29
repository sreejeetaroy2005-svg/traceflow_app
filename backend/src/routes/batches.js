const express = require('express');
const router = express.Router();
const db = require('../db');
const { genBatchId, genTxHash, uuid, nextStage } = require('../helpers');

router.get('/stats/overview', async (_req, res, next) => {
  try {
    const total       = await db.get('SELECT COUNT(*) as c FROM batches');
    const today       = await db.get("SELECT COUNT(*) as c FROM batches WHERE created_at::date = CURRENT_DATE");
    const byStatus    = await db.all('SELECT status, COUNT(*) as count FROM batches GROUP BY status');
    const byCity      = await db.all('SELECT city, COUNT(*) as count, SUM(total_weight) as weight FROM batches GROUP BY city');
    const totalTx     = await db.get('SELECT COUNT(*) as c FROM transactions');
    const weightToday = await db.get("SELECT COALESCE(SUM(total_weight),0) as w FROM batches WHERE created_at::date = CURRENT_DATE");
    res.json({ total: Number(total.c), today: Number(today.c), totalTx: Number(totalTx.c),
               weightToday: Number(weightToday.w), byStatus, byCity });
  } catch(e) { next(e); }
});

// Batch search
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const rows = await db.all(
      "SELECT * FROM batches WHERE id ILIKE $1 OR city ILIKE $1 ORDER BY created_at DESC LIMIT 10",
      [`%${q}%`]
    );
    res.json(rows);
  } catch(e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { city, status, limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT * FROM batches WHERE 1=1';
    const params = [];
    if (city)   { params.push(city);   sql += ` AND city = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    params.push(Number(limit), Number(offset));
    sql += ` ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    const rows = await db.all(sql, params);
    const result = await Promise.all(rows.map(async b => ({
      ...b,
      materials: await db.all('SELECT * FROM batch_materials WHERE batch_id = $1', [b.id])
    })));
    res.json(result);
  } catch(e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const batch = await db.get('SELECT * FROM batches WHERE id = $1', [req.params.id]);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    batch.materials    = await db.all('SELECT * FROM batch_materials WHERE batch_id = $1', [batch.id]);
    batch.transactions = await db.all('SELECT * FROM transactions WHERE batch_id = $1 ORDER BY created_at ASC', [batch.id]);
    res.json(batch);
  } catch(e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { city, materials, actor_id, location } = req.body;
    if (!city || !materials || !Array.isArray(materials))
      return res.status(400).json({ error: 'city and materials[] required' });
    const id = genBatchId(city);
    const totalWeight = materials.reduce((s, m) => s + (m.weight_kg || 0), 0);
    await db.transaction(async (client) => {
      const q = db.clientQuery(client);
      await q.run('INSERT INTO batches (id,city,status,total_weight) VALUES ($1,$2,$3,$4)', [id,city,'generated',totalWeight]);
      for (const m of materials)
        await q.run('INSERT INTO batch_materials (batch_id,material,weight_kg) VALUES ($1,$2,$3)', [id,m.material,m.weight_kg]);
      await q.run(`INSERT INTO transactions (id,batch_id,from_actor,to_actor,stage,weight_kg,location,tx_hash,block_number,gas_used)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [uuid(),id,null,actor_id||'SYSTEM','generated',totalWeight,location||city,
         genTxHash(),Math.floor(Math.random()*1000000)+4000000,Math.floor(Math.random()*50000)+21000]);
    });
    res.status(201).json(await db.get('SELECT * FROM batches WHERE id = $1', [id]));
  } catch(e) { next(e); }
});

router.post('/:id/advance', async (req, res, next) => {
  try {
    const { actor_id, location, materials } = req.body;
    const batch = await db.get('SELECT * FROM batches WHERE id = $1', [req.params.id]);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    const newStatus = nextStage(batch.status);
    if (newStatus === batch.status) return res.status(400).json({ error: 'Already at final stage' });
    const lastTx = await db.get('SELECT to_actor FROM transactions WHERE batch_id = $1 ORDER BY created_at DESC LIMIT 1', [batch.id]);
    await db.transaction(async (client) => {
      const q = db.clientQuery(client);
      await q.run('UPDATE batches SET status=$1, updated_at=NOW() WHERE id=$2', [newStatus, batch.id]);
      if (materials) {
        await q.run('DELETE FROM batch_materials WHERE batch_id=$1', [batch.id]);
        for (const m of materials)
          await q.run('INSERT INTO batch_materials (batch_id,material,weight_kg) VALUES ($1,$2,$3)', [batch.id,m.material,m.weight_kg]);
      }
      await q.run(`INSERT INTO transactions (id,batch_id,from_actor,to_actor,stage,weight_kg,location,tx_hash,block_number,gas_used)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [uuid(),batch.id,lastTx?.to_actor||null,actor_id||'SYSTEM',newStatus,
         batch.total_weight,location||batch.city,genTxHash(),
         Math.floor(Math.random()*1000000)+4000000,Math.floor(Math.random()*50000)+21000]);
    });
    res.json(await db.get('SELECT * FROM batches WHERE id = $1', [batch.id]));
  } catch(e) { next(e); }
});

module.exports = router;
