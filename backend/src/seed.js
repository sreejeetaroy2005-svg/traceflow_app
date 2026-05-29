require('dotenv').config();
const { initDb, run, all, transaction, clientQuery } = require('./db');
const { genBatchId, genLotId, genTxHash, uuid } = require('./helpers');

const CITIES    = ['Mumbai','Delhi','Bengaluru','Chennai','Hyderabad','Pune','Ahmedabad','Kolkata'];
const MATERIALS = ['PET Bottles','HDPE Plastic','Cardboard','E-Waste','Glass','Metal Scrap'];
const PRICES    = {'PET Bottles':15,'HDPE Plastic':11,'Cardboard':5,'Metal Scrap':36,'E-Waste':28,'Glass':4};
const STAGES    = ['generated','collected','sorted','aggregated','in_transit','delivered'];

const WORKERS = [
  {id:'RP-8834',name:'Sunita Devi',role:'ragpicker',city:'Mumbai',phone:'+919876543210',reputation:94},
  {id:'RP-2211',name:'Raju Yadav',role:'ragpicker',city:'Mumbai',phone:'+919876543211',reputation:82},
  {id:'RP-3301',name:'Meena Bai',role:'ragpicker',city:'Delhi',phone:'+919876543212',reputation:78},
  {id:'RP-4412',name:'Arjun Nair',role:'ragpicker',city:'Bengaluru',phone:'+919876543213',reputation:88},
  {id:'RP-5523',name:'Priya Kumari',role:'ragpicker',city:'Chennai',phone:'+919876543214',reputation:91},
  {id:'RP-6634',name:'Deepak Yadav',role:'ragpicker',city:'Pune',phone:'+919876543215',reputation:75},
  {id:'KB-1122',name:'Mohan Sharma',role:'kabadiwala',city:'Mumbai',phone:'+919876543220',reputation:96},
  {id:'KB-2233',name:'Suresh Gupta',role:'kabadiwala',city:'Delhi',phone:'+919876543221',reputation:89},
  {id:'KB-3344',name:'Ramesh Pillai',role:'kabadiwala',city:'Bengaluru',phone:'+919876543222',reputation:92},
  {id:'KB-4455',name:'Anita Joshi',role:'kabadiwala',city:'Pune',phone:'+919876543223',reputation:85},
  {id:'MW-4421',name:'Ramesh Patil',role:'municipal',city:'Mumbai',phone:'+919876543230',reputation:80},
  {id:'MW-5532',name:'Kavita Rao',role:'municipal',city:'Delhi',phone:'+919876543231',reputation:77},
  {id:'RC-5501',name:'GreenCycle Pvt Ltd',role:'industry',city:'Pune',phone:'+919876543240',reputation:98},
  {id:'RC-5502',name:'EcoRevive Industries',role:'industry',city:'Mumbai',phone:'+919876543241',reputation:95},
  {id:'RC-5503',name:'RecycleMart',role:'industry',city:'Delhi',phone:'+919876543242',reputation:90},
  {id:'RC-5504',name:'WasteWorth India',role:'industry',city:'Bengaluru',phone:'+919876543243',reputation:93},
];

async function seed() {
  const calledExternally = require.main === module;
  await initDb();
  console.log('🌱 Seeding...');

  await run('DELETE FROM orders');
  await run('DELETE FROM lots');
  await run('DELETE FROM transactions');
  await run('DELETE FROM batch_materials');
  await run('DELETE FROM batches');
  await run('DELETE FROM workers');
  await run('DELETE FROM users');

  // Workers
  for (const w of WORKERS)
    await run('INSERT INTO workers (id,name,role,city,phone,reputation) VALUES ($1,$2,$3,$4,$5,$6)',
      [w.id,w.name,w.role,w.city,w.phone,w.reputation]);
  console.log(`✓ ${WORKERS.length} workers`);

  // Demo users (pre-hashed passwords for speed)
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const DEMO_USERS = [
    { email:'admin@traceflow.in',    password:'admin123',    name:'Ankit Kumar',      role:'admin',      worker_id:null },
    { email:'ragpicker@traceflow.in',password:'demo123',     name:'Sunita Devi',      role:'ragpicker',  worker_id:'RP-8834' },
    { email:'kabadiwala@traceflow.in',password:'demo123',    name:'Mohan Sharma',     role:'kabadiwala', worker_id:'KB-1122' },
    { email:'municipal@traceflow.in', password:'demo123',    name:'Ramesh Patil',     role:'municipal',  worker_id:'MW-4421' },
    { email:'industry@traceflow.in',  password:'demo123',    name:'GreenCycle Ltd',   role:'industry',   worker_id:'RC-5501' },
  ];
  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await run('INSERT INTO users (id,email,password,name,role,worker_id) VALUES ($1,$2,$3,$4,$5,$6)',
      [uuidv4(), u.email, hash, u.name, u.role, u.worker_id]);
  }
  console.log(`✓ ${DEMO_USERS.length} demo users`);

  const ragpickers  = WORKERS.filter(w => w.role === 'ragpicker');
  const kabadiwalas = WORKERS.filter(w => w.role === 'kabadiwala');

  // Batches
  let batchCount = 0;
  for (let i = 0; i < 80; i++) {
    const city     = CITIES[i % CITIES.length];
    const stageIdx = Math.floor(Math.random() * STAGES.length);
    const status   = STAGES[stageIdx];
    const mats     = MATERIALS.slice(0, Math.floor(Math.random()*3)+1)
                       .map(m => ({ material: m, weight_kg: parseFloat((Math.random()*10+1).toFixed(1)) }));
    const totalW   = parseFloat(mats.reduce((s,m)=>s+m.weight_kg,0).toFixed(1));
    const daysAgo  = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const batchId  = genBatchId(city);

    await run('INSERT INTO batches (id,city,status,total_weight,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [batchId,city,status,totalW,createdAt,createdAt]);
    for (const m of mats)
      await run('INSERT INTO batch_materials (batch_id,material,weight_kg) VALUES ($1,$2,$3)', [batchId,m.material,m.weight_kg]);

    const rp = ragpickers.find(w=>w.city===city) || ragpickers[0];
    const kb = kabadiwalas.find(w=>w.city===city) || kabadiwalas[0];
    const toActors   = ['MW-4421',rp.id,kb.id,'RC-5501','RC-5501','RC-5501'];
    const fromActors = [null,'MW-4421',rp.id,kb.id,kb.id,'RC-5501'];

    for (let s = 0; s <= stageIdx; s++) {
      const txTime = new Date(new Date(createdAt).getTime() + s*3600000).toISOString();
      await run(`INSERT INTO transactions (id,batch_id,from_actor,to_actor,stage,weight_kg,location,tx_hash,block_number,gas_used,created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [uuid(),batchId,fromActors[s]||null,toActors[s]||'SYSTEM',STAGES[s],
         totalW,city,genTxHash(),4000000+Math.floor(Math.random()*1000000),
         21000+Math.floor(Math.random()*50000),txTime]);
    }
    batchCount++;
  }
  console.log(`✓ ${batchCount} batches`);

  // Lots
  let lotCount = 0;
  for (const kb of kabadiwalas) {
    for (const mat of MATERIALS.slice(0,3)) {
      const grade = ['A','B','C'][Math.floor(Math.random()*3)];
      const qty   = Math.floor(Math.random()*500)+50;
      const price = PRICES[mat] + Math.floor(Math.random()*4) - 2;
      await run('INSERT INTO lots (id,kabadiwala_id,material,quantity_kg,price_per_kg,grade,city) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [genLotId(kb.city),kb.id,mat,qty,price,grade,kb.city]);
      lotCount++;
    }
  }
  console.log(`✓ ${lotCount} lots`);
  console.log('✅ Seed complete!');
  if (calledExternally) process.exit(0);
}

module.exports = { run: seed };

if (require.main === module) {
  seed().catch(err => { console.error(err); process.exit(1); });
}
