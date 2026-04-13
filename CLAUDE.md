# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development — runs Express backend (port 3001) + Vite dev server (port 5173) concurrently
npm run dev

# Production build
npm run build

# Start production server (serves pre-built dist/)
npm start

# Preview production build locally
npm run preview
```

There are no tests. There is no linter configured.

## Environment

Copy `.env.example` to `.env` and optionally set:
- `TAOSTATS_API_KEY` — free key from taostats.io/pro; if omitted the app runs in **demo mode** with seeded mock data
- `PORT` — defaults to 3001

## Architecture

**Two-process dev setup**: Vite proxies `/api/*` requests to Express (`localhost:3001`). In production, Express serves the `dist/` static bundle directly and handles API routes.

**Backend** ([server.js](server.js)):
- `GET /api/subnets` — fetches pool data from TaoStats API (60s in-memory cache); falls back to mock data on error or missing API key
- `GET /api/stats` — aggregates TAO price (CoinGecko), subnet count, total market cap, block height
- Subnet metadata (category, description, GPU-intensive flag) is hardcoded in `server.js` for ~47 known subnets
- Unit conversion: TaoStats returns values in **rao** (1 TAO = 1e9 rao); `server.js` divides by 1e9 before sending to frontend

**Frontend** ([src/](src/)):
- [App.jsx](src/App.jsx) — top-level state, polling (30s interval), demo-mode detection
- [Header.jsx](src/components/Header.jsx) — global stats bar (TAO price, market cap, block height)
- [SubnetTable.jsx](src/components/SubnetTable.jsx) — sortable/filterable table; category filter tabs
- [SubnetModal.jsx](src/components/SubnetModal.jsx) — per-subnet detail view with 7-day sparkline
- [utils/format.js](src/utils/format.js) — TAO/USD formatting helpers
- [utils/api.js](src/utils/api.js) — thin fetch wrappers for both API endpoints
- [utils/mockData.js](src/utils/mockData.js) — seeded LCG generator for deterministic demo data

**Styling**: Tailwind CSS dark theme with zinc/violet accents. No component library — all UI is custom JSX + Tailwind classes.
