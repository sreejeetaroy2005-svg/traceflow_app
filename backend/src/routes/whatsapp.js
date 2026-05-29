const express = require('express');
const router = express.Router();
const db = require('../db');
const { genBatchId, genTxHash, uuid } = require('../helpers');

const MAT_MAP = { PET:'PET Bottles', HDPE:'HDPE Plastic', CARD:'Cardboard',
                  METAL:'Metal Scrap', EWST:'E-Waste', GLASS:'Glass' };
const PRICES  = {'PET Bottles':15,'HDPE Plastic':11,'Cardboard':5,'Metal Scrap':36,'E-Waste':28,'Glass':4};

async function processMessage(worker, text) {
  const tokens = text.trim().toUpperCase().split(/\s+/);
  const materials = [];
  for (let i = 0; i < tokens.length - 1; i += 2) {
    const mat = MAT_MAP[tokens[i]];
    const kg  = parseFloat(tokens[i+1]);
    if (mat && !isNaN(kg) && kg > 0) materials.push({ material: mat, weight_kg: kg });
  }
  if (materials.length === 0) {
    return `Namaste ${worker.name} 👋\nSend material pickup to log.\nFormat: PET 5.2 HDPE 4.1 CARD 3.1\nSupported: PET HDPE CARD METAL EWST GLASS`;
  }
  const totalWeight = materials.reduce((s, m) => s + m.weight_kg, 0);
  const batchId = genBatchId(worker.city);

  await db.transaction(async (client) => {
    const q = db.clientQuery(client);
    await q.run('INSERT INTO batches (id,city,status,total_weight) VALUES ($1,$2,$3,$4)',
      [batchId, worker.city, 'generated', totalWeight]);
    for (const m of materials)
      await q.run('INSERT INTO batch_materials (batch_id,material,weight_kg) VALUES ($1,$2,$3)',
        [batchId, m.material, m.weight_kg]);
    await q.run(`INSERT INTO transactions (id,batch_id,from_actor,to_actor,stage,weight_kg,location,tx_hash,block_number,gas_used)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [uuid(), batchId, null, worker.id, 'generated', totalWeight, worker.city,
       genTxHash(), Math.floor(Math.random()*1000000)+4000000, 21000]);
  });

  const kab = await db.get("SELECT * FROM workers WHERE role='kabadiwala' AND city=$1 AND active=1 ORDER BY RANDOM() LIMIT 1", [worker.city]);
  const estValue = Math.round(materials.reduce((s, m) => s + m.weight_kg * (PRICES[m.material] || 10), 0));
  let reply = `✓ Logged. Batch ${batchId} created.\nWeight: ${totalWeight.toFixed(1)}kg\nEstimated value: ₹${estValue}`;
  if (kab) reply += `\n${kab.name} (⭐${(kab.reputation/20).toFixed(1)}) is nearby.`;
  reply += `\nPayment within 2 hours via UPI.`;
  return reply;
}

router.post('/message', async (req, res, next) => {
  try {
    const from = req.body.From || req.body.from;
    const body = req.body.Body || req.body.body;
    if (!from || !body) return res.status(400).json({ error: 'from and body required' });
    const worker = await db.get('SELECT * FROM workers WHERE phone = $1', [from]);
    if (!worker) return res.json({ reply: "You're not registered on TraceFlow. Contact your supervisor." });
    const reply = await processMessage(worker, body);
    res.json({ reply, worker_id: worker.id });
  } catch(e) { next(e); }
});

router.get('/simulate', async (req, res, next) => {
  try {
    const { phone, message } = req.query;
    if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });
    const worker = await db.get('SELECT * FROM workers WHERE phone = $1', [phone]);
    if (!worker) return res.json({ reply: 'Worker not found for this phone number.' });
    res.json({ reply: await processMessage(worker, message) });
  } catch(e) { next(e); }
});

module.exports = router;
