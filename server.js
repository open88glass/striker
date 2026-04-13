import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateMockData } from './src/utils/mockData.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001
const API_KEY = process.env.TAOSTATS_API_KEY || ''
const BASE = 'https://api.taostats.io'
const RAO = 1e9           // 1 TAO = 1e9 rao (smallest unit)
const API_TIMEOUT = 25_000 // Taostats can take ~13-15 s on free tier
const CACHE_TTL   = 60_000 // 60 s keeps us within 5 req/min (2 Taostats + 1 CoinGecko per cycle)

// Simple in-memory cache
const cache = { data: null, ts: 0 }
const priceCache = { usd: null, ts: 0 }
const PRICE_TTL = 60_000   // refresh TAO price every 60 s

async function fetchTaoPrice() {
  if (priceCache.usd !== null && Date.now() - priceCache.ts < PRICE_TTL) {
    return priceCache.usd
  }
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd',
      { signal: AbortSignal.timeout(8_000) }
    )
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
    const json = await res.json()
    const price = json?.bittensor?.usd ?? null
    if (price !== null) { priceCache.usd = price; priceCache.ts = Date.now() }
    return price ?? priceCache.usd ?? 0
  } catch (err) {
    console.error('[Price fetch]', err.message)
    return priceCache.usd ?? 0
  }
}

// GPU-intensive subnets (do heavy ML inference/training)
const GPU_SUBNETS = new Set([1, 2, 3, 4, 6, 9, 17, 18, 19, 24, 25, 27, 29, 34, 37, 38, 39, 52])

app.use(cors())
app.use(express.json())

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiGet(path, params = {}) {
  const url = new URL(BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { Authorization: API_KEY },
    signal: AbortSignal.timeout(API_TIMEOUT),
  })
  if (!res.ok) throw new Error(`Taostats ${res.status} on ${path}`)
  return res.json()
}

// ── Normalise a pool record into our schema ───────────────────────────────────
function normalizePool(raw) {
  const netuid = Number(raw.netuid)
  const priceTao = parseFloat(raw.price || 0)

  // Price-change fields arrive as plain percentages (e.g. 4.04 = +4.04%)
  const change1d = parseFloat(raw.price_change_1_day || 0)
  const change7d = parseFloat(raw.price_change_1_week || 0)

  return {
    netuid,
    name: raw.name || `Subnet ${netuid}`,
    symbol: raw.symbol || `SN${netuid}`,
    description: '',
    category: 'other',            // not in API, enriched later from mock meta
    status: raw.startup_mode ? 'startup' : 'active',
    price_tao: priceTao,
    market_cap_tao: parseFloat(raw.market_cap || 0) / RAO,
    volume_24h_tao: parseFloat(raw.tao_volume_24_hr || 0) / RAO,
    buy_volume_24h_tao: parseFloat(raw.tao_buy_volume_24_hr || 0) / RAO,
    sell_volume_24h_tao: parseFloat(raw.tao_sell_volume_24_hr || 0) / RAO,
    emission_pct: 0,              // needs separate endpoint
    tao_in: parseFloat(raw.total_tao || 0) / RAO,
    reg_cost_tao: 0,              // needs hyperparameter endpoint
    registered_at: null,
    registered_block: 0,
    validators: 0,                // needs metagraph endpoint
    miners: 0,
    neurons: 0,
    price_change_1d: change1d,
    price_change_7d: change7d,
    price_change_1h: parseFloat(raw.price_change_1_hour || 0),
    price_change_1m: parseFloat(raw.price_change_1_month || 0),
    tao_flow_1d: 0,               // merged from tao_flow endpoint
    tao_flow_7d: 0,
    owner: '',
    gpu_intensive: GPU_SUBNETS.has(netuid),
    // Extra fields from pool endpoint
    fear_and_greed: raw.fear_and_greed_index,
    fear_and_greed_sentiment: raw.fear_and_greed_sentiment,
    highest_price_24h: parseFloat(raw.highest_price_24_hr || 0) || null,
    lowest_price_24h: parseFloat(raw.lowest_price_24_hr || 0) || null,
    buys_24h: raw.buys_24_hr || 0,
    sells_24h: raw.sells_24_hr || 0,
    startup_mode: !!raw.startup_mode,
    root_prop: parseFloat(raw.root_prop || 0),
    rank: raw.rank,
    seven_day_prices: (raw.seven_day_prices || []).map(p => ({
      t: p.timestamp,
      price: parseFloat(p.price),
    })),
  }
}

// ── Category / description lookup (for known subnets) ─────────────────────────
const SUBNET_META = {
  0:  { category: 'infrastructure', description: 'Root network — validator consensus layer' },
  1:  { category: 'nlp',            description: 'Text prompting & LLM inference' },
  2:  { category: 'ai',             description: 'AI health data & continual learning' },
  3:  { category: 'audio',          description: 'Voice synthesis & TTS generation' },
  4:  { category: 'nlp',            description: 'LLM reasoning & verifiable inference' },
  5:  { category: 'data',           description: 'Web3 social & financial search engine' },
  6:  { category: 'nlp',            description: 'LLM fine-tuning & RLHF' },
  7:  { category: 'infrastructure', description: 'Decentralized network infrastructure' },
  8:  { category: 'finance',        description: 'Proprietary trading network & forecasting' },
  9:  { category: 'nlp',            description: 'Large language model pretraining' },
  10: { category: 'finance',        description: 'DeFi lending optimization & yield' },
  11: { category: 'audio',          description: 'Audio transcription & speech recognition' },
  12: { category: 'data',           description: 'On-chain analytics & blockchain data' },
  13: { category: 'data',           description: 'Decentralized data storage & retrieval' },
  14: { category: 'security',       description: 'LLM security & adversarial robustness' },
  15: { category: 'infrastructure', description: 'Decentralized validation & verification' },
  16: { category: 'other',          description: 'Decentralized advertising network' },
  17: { category: 'vision',         description: '3D generation, rendering & avatars' },
  18: { category: 'compute',        description: 'Distributed AI compute orchestration' },
  19: { category: 'compute',        description: 'High-throughput AI inference marketplace' },
  20: { category: 'ai',             description: 'Autonomous AI agent framework' },
  21: { category: 'audio',          description: 'AI podcast generation & audio content' },
  22: { category: 'data',           description: 'Decentralized web scraping & data oracle' },
  23: { category: 'nlp',            description: 'Niche topic search & knowledge distillation' },
  24: { category: 'vision',         description: 'Multimodal LLM & video understanding' },
  25: { category: 'science',        description: 'Protein structure prediction & drug discovery' },
  26: { category: 'storage',        description: 'Decentralized redundant data storage' },
  27: { category: 'compute',        description: 'Distributed GPU compute marketplace' },
  28: { category: 'storage',        description: 'Decentralized AI data storage (0G)' },
  29: { category: 'nlp',            description: 'Continual pretraining & cold-start optimization' },
  30: { category: 'security',       description: 'Deepfake detection & media authenticity' },
  37: { category: 'nlp',            description: 'LLM task-specific fine-tuning' },
  38: { category: 'compute',        description: 'Distributed ML training across GPUs' },
  39: { category: 'compute',        description: 'Edge device ML optimization & pruning' },
}

// ── GET /api/subnets ──────────────────────────────────────────────────────────
app.get('/api/subnets', async (_req, res) => {
  if (!API_KEY) {
    return res.json({ data: generateMockData(), demo: true, source: 'mock' })
  }

  // Serve stale cache immediately while a refresh runs in background
  if (cache.data) {
    const age = Date.now() - cache.ts
    if (age < CACHE_TTL) return res.json(cache.data)
    // Stale — return cached but kick off refresh
    res.json(cache.data)
    refreshCache().catch(err => console.error('[Cache refresh]', err.message))
    return
  }

  // No cache yet — wait for first fetch
  try {
    const result = await buildSubnetData()
    cache.data = result
    cache.ts   = Date.now()
    res.json(result)
  } catch (err) {
    console.error('[API Error]', err.message)
    const fallback = { data: generateMockData(), demo: true, source: 'mock', error: err.message }
    cache.data = fallback
    cache.ts   = Date.now()
    res.json(fallback)
  }
})

async function refreshCache() {
  const result = await buildSubnetData()
  cache.data = result
  cache.ts   = Date.now()
}

async function buildSubnetData() {
  // Parallel: pool data + TAO flow data
  const [poolJson, flowJson] = await Promise.all([
    apiGet('/api/dtao/pool/latest/v1', { per_page: 300 }),
    apiGet('/api/dtao/tao_flow/v1', { per_page: 300 }),
  ])

  // Build flow lookup (netuid → TAO daily flow)
  const flowMap = new Map()
  for (const f of flowJson.data || []) {
    const netuid = Number(f.netuid)
    // Skip root (netuid 0) — its raw value is anomalous in the flow endpoint
    if (netuid > 0) flowMap.set(netuid, f.tao_flow / RAO)
  }

  // Normalise pool records and merge flow data
  const data = (poolJson.data || []).map(raw => {
    const subnet = normalizePool(raw)
    const meta = SUBNET_META[subnet.netuid]
    if (meta) {
      subnet.category    = meta.category
      subnet.description = meta.description
    }
    if (flowMap.has(subnet.netuid)) {
      subnet.tao_flow_1d = flowMap.get(subnet.netuid)
    }
    return subnet
  })

  return {
    data,
    demo: false,
    source: 'taostats',
    // Expose pagination meta so /api/stats can reuse this without an extra API call
    total_subnets: poolJson.pagination?.total_items ?? data.length,
    block_height: poolJson.data?.[0]?.block_number ?? 0,
  }
}

// ── GET /api/stats ────────────────────────────────────────────────────────────
app.get('/api/stats', async (_req, res) => {
  const taoPriceUsd = await fetchTaoPrice()

  if (!API_KEY) {
    const blockHeight = Math.floor((Date.now() - new Date('2023-03-15').getTime()) / 12_000)
    return res.json({
      tao_price_usd: taoPriceUsd,
      total_subnets: 64,
      total_market_cap_tao: 128_500_000,
      total_volume_24h_tao: 2_750_000,
      block_height: blockHeight,
      timestamp: new Date().toISOString(),
    })
  }

  // Reuse subnet cache — avoids a redundant Taostats call (saves ~1 req/min)
  const cached = cache.data
  const totalSubnets = cached?.total_subnets ?? 0
  const latestBlock  = cached?.block_height  ?? 0

  res.json({
    tao_price_usd: taoPriceUsd,
    total_subnets: totalSubnets,
    total_market_cap_tao: 0,
    total_volume_24h_tao: 0,
    block_height: latestBlock,
    timestamp: new Date().toISOString(),
  })
})

// ── Static files (production build) ──────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  const mode = API_KEY ? 'LIVE (Taostats API)' : 'DEMO (mock data)'
  console.log(`\n  Bittensor Dashboard  →  http://localhost:${PORT}`)
  console.log(`  Mode: ${mode}\n`)
})
