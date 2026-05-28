# TraceFlow — Waste Intelligence Network

A blockchain-powered, AI-assisted waste traceability platform for India's informal recycling ecosystem. Built as a single-page hackathon demo.

**Live Demo:** [traceflow.vercel.app](https://traceflow.vercel.app)

---

## What it does

TraceFlow connects 4 million informal waste workers to a transparent, blockchain-verified supply chain — from household pickup to industrial recycling.

- End-to-end batch tracking with QR codes and SMS logging
- Immutable ledger records on Hyperledger Fabric
- AI-powered supply-demand matching between kabadiwalas and recyclers
- Role-based dashboards for every actor in the waste chain

## Pages

| Page | Description |
|------|-------------|
| Overview | Live KPI dashboard, transaction feed, city performance table |
| Live Tracker | Animate a waste batch through 5 chain stages with blockchain verification |
| Stakeholders | WhatsApp bot UI, kabadiwala dashboard, municipality heatmap, industry procurement |
| Network Map | Animated shipment routes across 8 Indian cities |
| Analytics | Recovery trends, material breakdown, worker onboarding charts |
| Settings | Profile, notifications, blockchain config, data export |

## Tech

**Frontend** — Pure HTML + CSS + Vanilla JS. No frameworks, no external JS libraries.
- Google Fonts (Space Grotesk, Inter, JetBrains Mono)
- Canvas 2D API for all charts

**Backend** — Node.js + Express + SQLite (sql.js)
- REST API with 6 route groups
- Persistent SQLite database
- No native dependencies — runs anywhere

## API Endpoints

| Group | Endpoints |
|-------|-----------|
| Workers | `GET/POST /api/workers` · `GET /api/workers/:id` · `PATCH /api/workers/:id/reputation` |
| Batches | `GET/POST /api/batches` · `GET /api/batches/:id` · `POST /api/batches/:id/advance` |
| Transactions | `GET /api/transactions` · `GET /api/transactions/verify/:hash` |
| Lots | `GET/POST /api/lots` · `POST /api/lots/:id/order` |
| Analytics | `GET /api/analytics/dashboard` · `/recovery` · `/cities` · `/materials` |
| WhatsApp Bot | `POST /api/whatsapp/message` · `GET /api/whatsapp/simulate` |

## Run locally

**Frontend** — open `index.html` in any browser.

**Backend:**
```bash
cd backend
cp .env.example .env
npm install
node src/seed.js   # seed the database
npm start          # runs on http://localhost:3001
```

## Deploy

**Frontend** → Vercel (connected to this GitHub repo, auto-deploys on push)

**Backend** → Railway:
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `backend/` folder
3. Set env var: `NODE_ENV=production`
4. Railway auto-detects Node.js and runs `npm start`

---

Built for [Hackathon Name] · Team [Team Name]
