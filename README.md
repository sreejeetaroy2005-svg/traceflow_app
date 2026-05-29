# TraceFlow — Waste Intelligence Network

Blockchain-powered, AI-assisted waste traceability platform for India's informal recycling ecosystem. Built as a full-stack hackathon demo with a live backend and real persistent data.

**Live Demo:** [traceflow.vercel.app](https://traceflow.vercel.app)
**API:** [traceflow-app.onrender.com](https://traceflow-app.onrender.com/api)

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@traceflow.in | admin123 |
| Ragpicker | ragpicker@traceflow.in | demo123 |
| Kabadiwala | kabadiwala@traceflow.in | demo123 |
| Municipal | municipal@traceflow.in | demo123 |
| Industry | industry@traceflow.in | demo123 |

---

## What it does

Connects 4 million informal waste workers to a transparent, blockchain-verified supply chain — from household pickup to industrial recycling.

- End-to-end batch tracking with QR codes and SMS/WhatsApp logging
- Immutable ledger records with cryptographic tx hashes
- AI-powered supply-demand matching between kabadiwalas and recyclers
- Role-based dashboards for every actor in the waste chain
- JWT authentication with role-based access control

---

## Pages

| Page | Description |
|------|-------------|
| Overview | Live KPI dashboard, real-time transaction feed, city performance table |
| Live Tracker | Track any batch through 5 chain stages with blockchain verification |
| Stakeholders | WhatsApp bot UI, kabadiwala dashboard, municipality heatmap, industry procurement |
| Network Map | Animated shipment routes across 8 Indian cities |
| Analytics | Recovery trends, material breakdown, worker onboarding charts |
| Settings | Profile, notifications, blockchain config, data export |

---

## Tech Stack

**Frontend**
- Pure HTML + CSS + Vanilla JS — no frameworks
- Canvas 2D API for all charts
- Google Fonts (Space Grotesk, Inter, JetBrains Mono)
- JWT stored in localStorage, sent as Bearer token

**Backend**
- Node.js + Express
- PostgreSQL (Neon) — persistent database
- JWT auth with bcrypt password hashing
- sql.js → pg migration for production persistence

---

## API Endpoints

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /api/auth/login` · `POST /api/auth/register` · `GET /api/auth/me` |
| Workers | `GET/POST /api/workers` · `GET /api/workers/:id` · `PATCH /api/workers/:id/reputation` |
| Batches | `GET/POST /api/batches` · `GET /api/batches/:id` · `POST /api/batches/:id/advance` · `GET /api/batches/search?q=` |
| Transactions | `GET /api/transactions` · `GET /api/transactions/verify/:hash` |
| Lots | `GET/POST /api/lots` · `POST /api/lots/:id/order` |
| Analytics | `GET /api/analytics/dashboard` · `/recovery` · `/cities` · `/materials` |
| WhatsApp Bot | `POST /api/whatsapp/message` · `GET /api/whatsapp/simulate?phone=&message=` |

---

## Run locally

**Frontend** — open `index.html` in any browser. No build step needed.

**Backend:**
```bash
cd backend
cp .env.example .env
# fill in DATABASE_URL and JWT_SECRET in .env
npm install
node src/seed.js    # seed the database
npm start           # runs on http://localhost:3001
```

Required env vars:
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5500
```

---

## Deploy

**Frontend** → Vercel (auto-deploys on push to `main`)

**Backend** → Render:
- Root directory: `backend`
- Build command: `npm install`
- Start command: `node src/index.js`
- Env vars: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`

**Database** → Neon (free PostgreSQL, persistent across deploys)

On first startup the backend auto-seeds the database if empty.

---

## Roadmap

- [ ] Role-specific dashboards (ragpicker sees only their batches, etc.)
- [ ] Twilio WhatsApp integration (real SMS → real batch creation)
- [ ] WebSockets for live transaction feed
- [ ] TensorFlow.js material classification from photos
- [ ] Hyperledger Fabric real blockchain integration
- [ ] Mobile layout improvements

---

Built for [Hackathon Name] · Team [Team Name]
