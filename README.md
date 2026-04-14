# Bittensor Subnet Dashboard

A real-time dashboard for monitoring Bittensor subnet activity — prices, market caps, volumes, and more.

## Features

- Live subnet data via the TaoStats API (auto-refreshes every 30s)
- Global stats bar: TAO price, total market cap, block height
- Sortable, filterable table with category tabs
- Per-subnet detail modal with 7-day price sparkline
- Demo mode with realistic seeded mock data when no API key is set

## Setup

```bash
# Install dependencies
npm install

# Copy env file and optionally add your API key
cp .env.example .env
```

Edit `.env`:

```
TAOSTATS_API_KEY=your_key_here   # free key from taostats.io/pro
PORT=3001                         # optional, defaults to 3001
```

If `TAOSTATS_API_KEY` is omitted, the app runs in **demo mode** with mock data.

## Running

```bash
# Development (Vite on :5173 + Express on :3001)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Preview production build locally
npm run preview
```

## Architecture

Two-process dev setup: Vite proxies `/api/*` requests to Express on port 3001. In production, Express serves the pre-built `dist/` bundle and handles API routes.

### Backend ([server.js](server.js))

| Route | Description |
|---|---|
| `GET /api/subnets` | Fetches pool data from TaoStats (60s cache); falls back to mock data on error |
| `GET /api/stats` | Aggregates TAO price (CoinGecko), subnet count, total market cap, block height |

- Subnet metadata (category, description, GPU-intensive flag) is hardcoded for ~47 known subnets
- TaoStats returns values in **rao**; server divides by 1e9 before sending to the frontend

### Frontend ([src/](src/))

| File | Role |
|---|---|
| [App.jsx](src/App.jsx) | Top-level state, 30s polling, demo-mode detection |
| [Header.jsx](src/components/Header.jsx) | Global stats bar |
| [SubnetTable.jsx](src/components/SubnetTable.jsx) | Sortable/filterable table with category tabs |
| [SubnetModal.jsx](src/components/SubnetModal.jsx) | Per-subnet detail view with sparkline |
| [utils/format.js](src/utils/format.js) | TAO/USD formatting helpers |
| [utils/api.js](src/utils/api.js) | Fetch wrappers for both API endpoints |
| [utils/mockData.js](src/utils/mockData.js) | Seeded LCG generator for deterministic demo data |

**Styling**: Tailwind CSS dark theme (zinc/violet). No component library — all UI is custom JSX + Tailwind.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, lucide-react
- **Backend**: Node.js, Express
- **Data**: TaoStats API, CoinGecko API
