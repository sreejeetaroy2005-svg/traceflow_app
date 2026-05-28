const express = require('express');
const router = express.Router();
const db = require('../db');
const { genBatchId, genTxHash, uuid, nextStage } = require('../helpers');

// GET /api/batches/stats/overview — must be before /:id
router.get('/stats/overview', (_req, res) => {
  const total       = db.get('SELECT COUNT(*) as c FROM batches').c;
  const today       = db.get("SELECT COUNT(*) as c FROM batches WHERE date(created_at)=date('now')").c;
  const byStatus    = db.all('SELECT status, COUNT(*) as count FROM batches GROUP BY status');
  const byCity      = db.all('SELECT city, COUNT(*) as count, SUM(total_weight) as weight FROM batches GROUP BY city');
  const totalTx     = db.get('SELECT COUNT(*) as c FROM transactions').c;
  const weightToday = db.get("SELECT COALESCE(SUM(total_weight),0) as w FROM batches WHERE date(created_at)=date('now')").w;
  res.json({ total, today, totalTx, weightToday, byStatus, byCity });
});

// GET /api/batches
router.get('/', (req, res) => {
  const { city, status, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM batches WHERE 1=1';
  const params = [];
  if (city)   { sql += ' AND city = ?';   params.push(city); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const rows = db.all(sql, params);
  const result = rows.map(b => ({
    ...b,
    materials: db.all('SELECT * FROM batch_materials WHERE batch_id = ?', [b.id])
  }));
  res.json(result);
});

// GET /api/batches/:id
router.get('/:id', (req, res) => {
  const batch = db.get('SELECT * FROM batches WHERE id = ?', [req.params.id]);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  batch.materials    = db.all('SELECT * FROM batch_materials WHERE batch_id = ?', [batch.id]);
  batch.transactions = db.all('SELECT * FROM transactions WHERE batch_id = ? ORDER BY created_at ASC', [batch.id]);
  res.json(batch);
});

// POST /api/batches
router.post('/', (req, res) => {
  const { city, materials, actor_id, location } = req.body;
  if (!city || !materials || !Array.isArray(materials)) {
    return res.status(400).json({ error: 'city and materials[] required' });
  }
  const id = genBatchId(city);
  const totalWeight = materials.reduce((s, m) => s + (m.weight_kg || 0), 0);

  db.transaction(() => {
    db.run('INSERT INTO batches (id,city,status,total_weight) VALUES (?,?,?,?)', [id, city, 'generated', totalWeight]);
    materials.forEach(m => db.run('INSERT INTO batch_materials (batch_id,material,weight_kg) VALUES (?,?,?)', [id, m.material, m.weight_kg]));
    db.run(`INSERT INTO transactions (id,batch_id,from_actor,to_actor,stage,weight_kg,location,tx_hash,block_number,gas_used)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [uuid(), id, null, actor_id||'SYSTEM', 'generated', totalWeight, location||city,
       genTxHash(), Math.floor(Math.random()*1000000)+4000000, Math.floor(Math.random()*50000)+21000]);
  });

  res.status(201).json(db.get('SELECT * FROM batches WHERE id = ?', [id]));
});

// POST /api/batches/:id/advance
router.post('/:id/advance', (req, res) => {
  const { actor_id, location, materials } = req.body;
  const batch = db.get('SELECT * FROM batches WHERE id = ?', [req.params.id]);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const newStatus = nextStage(batch.status);
  if (newStatus === batch.status) return res.status(400).json({ error: 'Batch already at final stage' });

  const lastTx = db.get('SELECT to_actor FROM transactions WHERE batch_id = ? ORDER BY created_at DESC LIMIT 1', [batch.id]);

  db.transaction(() => {
    db.run("UPDATE batches SET status = ?, updated_at = datetime('now') WHERE id = ?", [newStatus, batch.id]);
    if (materials) {
      db.run('DELETE FROM batch_materials WHERE batch_id = ?', [batch.id]);
      materials.forEach(m => db.run('INSERT INTO batch_materials (batch_id,material,weight_kg) VALUES (?,?,?)', [batch.id, m.material, m.weight_kg]));
    }
    db.run(`INSERT INTO transactions (id,batch_id,from_actor,to_actor,stage,weight_kg,location,tx_hash,block_number,gas_used)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [uuid(), batch.id, lastTx?.to_actor||null, actor_id||'SYSTEM', newStatus,
       batch.total_weight, location||batch.city, genTxHash(),
       Math.floor(Math.random()*1000000)+4000000, Math.floor(Math.random()*50000)+21000]);
  });

  res.json(db.get('SELECT * FROM batches WHERE id = ?', [batch.id]));
});

module.exports = router;
