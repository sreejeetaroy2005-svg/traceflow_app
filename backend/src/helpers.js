const { v4: uuidv4 } = require('uuid');

// Generate a realistic-looking blockchain tx hash
function genTxHash() {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

// Generate a batch ID like TF-MUM-2024-00847
function genBatchId(city) {
  const codes = { Mumbai:'MUM', Delhi:'DEL', Bengaluru:'BLR', Chennai:'CHN',
                  Hyderabad:'HYD', Pune:'PUN', Ahmedabad:'AMD', Kolkata:'KOL' };
  const code = codes[city] || city.slice(0,3).toUpperCase();
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 90000) + 10000);
  return `TF-${code}-${year}-${num}`;
}

// Generate a lot ID like LOT-DH-4421
function genLotId(city) {
  const code = city.slice(0,3).toUpperCase();
  return `LOT-${code}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function uuid() { return uuidv4(); }

const STAGE_ORDER = ['generated','collected','sorted','aggregated','in_transit','delivered'];
function nextStage(current) {
  const i = STAGE_ORDER.indexOf(current);
  return i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : current;
}

module.exports = { genTxHash, genBatchId, genLotId, uuid, nextStage, STAGE_ORDER };
