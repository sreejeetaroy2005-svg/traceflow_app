require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/workers',      require('./routes/workers'));
app.use('/api/batches',      require('./routes/batches'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/lots',         require('./routes/lots'));
app.use('/api/analytics',    require('./routes/analytics'));
app.use('/api/whatsapp',     require('./routes/whatsapp'));

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api', (_req, res) => res.json({
  name: 'TraceFlow API', version: '1.0.0',
  endpoints: {
    workers:      'GET /api/workers  POST /api/workers  GET /api/workers/:id  PATCH /api/workers/:id/reputation',
    batches:      'GET /api/batches  POST /api/batches  GET /api/batches/:id  POST /api/batches/:id/advance',
    transactions: 'GET /api/transactions  GET /api/transactions/:id  GET /api/transactions/verify/:hash',
    lots:         'GET /api/lots  POST /api/lots  GET /api/lots/:id  POST /api/lots/:id/order',
    analytics:    'GET /api/analytics/dashboard  /recovery  /cities  /materials  /workers',
    whatsapp:     'POST /api/whatsapp/message  GET /api/whatsapp/simulate?phone=&message=',
  }
}));

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: err.message }); });

// Init DB, auto-seed if empty, then start server
initDb().then(async () => {
  const { all } = require('./db');
  const count = (all('SELECT COUNT(*) as c FROM workers')[0] || {}).c || 0;
  if (count === 0) {
    console.log('Empty DB — seeding...');
    await require('./seed').run();
    console.log('Seed done.');
  }
  app.listen(PORT, () => {
    console.log(`\n🚀 TraceFlow API → http://localhost:${PORT}`);
    console.log(`📖 Docs         → http://localhost:${PORT}/api`);
    console.log(`❤️  Health       → http://localhost:${PORT}/health\n`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
