# TraceFlow — Waste Intelligence Network

Blockchain-powered, AI-assisted waste traceability platform for India's informal recycling ecosystem. Built as a full-stack hackathon demo with a live backend and real persistent data.

**Live Demo:** [traceflow.vercel.app https://traceflow-app-s6n5.vercel.app/
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

### Login Screen
JWT-based authentication. Five demo account buttons auto-fill credentials. Token persists in localStorage so judges stay logged in across refreshes.

### Page 1 — Overview Dashboard
The main command center. Four KPI cards animate counting up from zero using real database values — total batches, active workers, material recovered today, blockchain transactions. Each card has a sparkline chart and percentage change badge.

Left panel: live transaction feed showing real blockchain records — tx hash, actor type, material, weight, city, time. Polls every 5 seconds for new entries.

Right panel: donut chart of material breakdown by weight (PET, HDPE, Cardboard, E-Waste, Glass, Metal) drawn on Canvas with a custom legend.

Bottom: city performance table for 8 Indian cities with batch counts, recovery rate as a colored progress bar, and status badge. Clicking any row opens a stats popover.

### Page 2 — Live Batch Tracker
Terminal-style search bar pre-filled with a real batch ID. Fetches the full batch record from the API — all 5 stages, all transactions, all materials.

Left: vertical stepper timeline. Each stage has a colored node, actor name, location, timestamp, weight, and "View on Chain" button that slides open a panel with the full tx hash, block number, and gas used.

Right: blockchain verification panel showing the actual hash, previous hash, block number, smart contract events log, and transfer history. "Verify Integrity" runs a progress animation and confirms the chain.

"Run Simulation" animates a new batch through all 5 stages in real time, writing new transaction hashes to the panel as each stage completes.

### Page 3 — Stakeholder Views
Four tabs, each showing a different actor's interface.

**Ragpicker** — Sunita Devi's profile with reputation arc, earnings, verified badge. WhatsApp-style chat with the bot. "Simulate New Pickup" hits the real API, creates a real batch in the database, and the bot replies with the actual batch ID and earnings estimate.

**Kabadiwala** — Tablet dashboard with incoming lots table, bar chart of weekly earnings by material (Canvas), stock inventory, and price alerts. "Post to Market" opens a modal form.

**Municipality** — 12 zone cards for Mumbai colored by collection status. Each shows trucks deployed, weight collected, compliance percentage. Critical zones have a "Dispatch Alert" button.

**Industry** — Procurement board with real lot data from the database. Filterable by material, city, grade. Paginated table with seller ratings, price per kg, and "Request Quote" that slides open full lot details and a "Place Order" button.

### Page 4 — Network Map
Canvas-drawn schematic of India with 8 glowing city nodes sized by activity volume. Animated dashed lines show active shipments moving between cities using stroke-dashoffset animation. Clicking any city node shows a tooltip with workers, batches, blockchain nodes, and latency.

### Page 5 — Analytics
Four charts drawn entirely with Canvas 2D API — no Chart.js or external libraries.

- Line chart: monthly waste recovery volume with two lines (Total Collected vs Actually Recycled), data from real DB
- Horizontal bar chart: recovery rate by material type, bars animate from zero
- Area chart: worker onboarding trend over 12 months
- Scatter plot: cities plotted by workers vs recovery rate, dot size = volume

Date range selector re-renders all charts with different data.

### Page 6 — Settings
Profile form, notification toggles (CSS-only switches), blockchain config with live connection test, and data export buttons (CSV/PDF).

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

## Roadmap

- [ ] Role-specific dashboards (ragpicker sees only their batches, etc.)
- [ ] Twilio WhatsApp integration (real SMS → real batch creation)
- [ ] WebSockets for live transaction feed
- [ ] TensorFlow.js material classification from photos
- [ ] Hyperledger Fabric real blockchain integration
- [ ] Mobile layout improvements

---

extra material:https://drive.google.com/drive/folders/1MeNhRxbojYZRf3bPXiYVkhn_27Li5C6t
