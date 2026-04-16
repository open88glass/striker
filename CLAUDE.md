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
- `TAO_APP_API_KEY` — API key from tao.app; if omitted the app runs in **demo mode** with seeded mock data
- `PORT` — defaults to 3001

## Architecture

**Two-process dev setup**: Vite proxies `/api/*` requests to Express (`localhost:3001`). In production, Express serves the `dist/` static bundle directly and handles API routes.

### Data pipeline

`buildSubnetData()` in [server.js](server.js) fires three tao.app requests in parallel on each cache miss:
1. `/api/beta/subnet_screener` — market data (price, volume, market cap, tao_in, price changes)
2. `/api/beta/analytics/subnets/info` — registration block + owner coldkey, built into `infoMap` keyed by netuid
3. `/api/beta/blocks/latest` — current block height

`normalizeSubnet(raw, infoMap)` merges these into a flat schema. `SUBNET_META` (hardcoded in server.js for ~47 known subnets) then enriches `category`, `description`, and `gpu_intensive`.

**Known gaps** — hardcoded to `0`/`null` because tao.app screener doesn't return them:
- `reg_cost_tao` — may be available in the info endpoint; check `[info sample FULL]` in server logs
- `validators` / `miners` — requires per-subnet metagraph calls (100+ requests/refresh, impractical at 5 req/min rate limit)
- `seven_day_prices` — empty at load; fetched on-demand via `GET /api/sparkline/:netuid` when a modal opens

**Cache strategy**: `/api/subnets` uses stale-while-revalidate (60s TTL). Stale cache is returned immediately while a background refresh runs, so clients are never blocked.

**Stats aggregation**: `total_market_cap_tao` and `total_volume_24h_tao` shown in the header are computed client-side in [App.jsx](src/App.jsx) by summing subnet data — not from `/api/stats`. The stats endpoint only contributes TAO price (CoinGecko) and block height (reused from subnet cache).

### Frontend

[App.jsx](src/App.jsx) owns all state and polls every 30s. It passes `subnets[]` to `SubnetTable` and `selectedSubnet` to `SubnetModal`. The `demo` flag from the API response drives the amber warning banner.

The `rank` field is `null` in live data (not assigned by tao.app); the table falls back to `s.netuid` for the `#` column.

**Styling**: Tailwind CSS dark theme with zinc/violet accents. No component library — all UI is custom JSX + Tailwind classes.
