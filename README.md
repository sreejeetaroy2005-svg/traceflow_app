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

Pure HTML + CSS + Vanilla JS. No frameworks, no external JS libraries.

- Google Fonts (Space Grotesk, Inter, JetBrains Mono)
- Canvas 2D API for all charts
- CSS animations and keyframes for all transitions

## Run locally

Just open `index.html` in any browser. No build step, no server needed.

## Deploy

Deployed via Vercel connected to this GitHub repo. Any push to `main` triggers an automatic redeploy.

---

Built for [Hackathon Name] · Team [Team Name]
