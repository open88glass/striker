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
const API_KEY = process.env.TAO_APP_API_KEY || ''
const BASE = 'https://api.tao.app'
const API_TIMEOUT = 15_000 // tao.app is responsive; 15 s is generous
const CACHE_TTL   = 60_000 // 60 s — 3 tao.app calls + 1 CoinGecko per cycle

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

app.use(cors())
app.use(express.json())

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiGet(path, params = {}) {
  const url = new URL(BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { 'X-API-Key': API_KEY },
    signal: AbortSignal.timeout(API_TIMEOUT),
  })
  if (!res.ok) throw new Error(`tao.app ${res.status} on ${path}`)
  return res.json()
}

// ── Normalise a tao.app subnet_screener record into our schema ────────────────
// tao.app already returns values in TAO — no rao conversion needed.
function normalizeSubnet(raw, infoMap) {
  const netuid = Number(raw.netuid)
  const info = infoMap.get(netuid) || {}
  return {
    netuid,
    name: raw.subnet_name || `Subnet ${netuid}`,
    symbol: raw.symbol || `SN${netuid}`,
    description: '',
    category: 'other',          // enriched below from SUBNET_META
    status: 'active',
    price_tao: parseFloat(raw.price || 0),
    market_cap_tao: parseFloat(raw.market_cap_tao || 0),
    volume_24h_tao: parseFloat(raw.total_volume_tao_1d || 0),
    buy_volume_24h_tao: parseFloat(raw.buy_volume_tao_1d || 0),
    sell_volume_24h_tao: parseFloat(raw.sell_volume_tao_1d || 0),
    emission_pct: parseFloat(raw.emission_pct || 0),
    tao_in: parseFloat(raw.tao_in || 0),
    reg_cost_tao: 0,            // not available from tao.app screener
    registered_at: blockNumToIso(info.network_registered_at),
    registered_block: info.network_registered_at || 0,
    validators: 0,              // needs metagraph endpoint
    miners: 0,
    neurons: 0,
    price_change_1d: parseFloat(raw.price_1d_pct_change || 0),
    price_change_7d: parseFloat(raw.price_7d_pct_change || 0),
    price_change_1h: parseFloat(raw.price_1h_pct_change || 0),
    price_change_1m: parseFloat(raw.price_1m_pct_change || 0),
    tao_flow_1d: parseFloat(raw.net_volume_tao_24h || 0),
    tao_flow_7d: parseFloat(raw.net_volume_tao_7d || 0),
    owner: raw.owner_coldkey || info.owner_coldkey || '',
    gpu_intensive: false,       // enriched from SUBNET_META
    fear_and_greed: null,       // per-subnet not available; use /api/beta/analytics/macro/fear_greed separately if needed
    fear_and_greed_sentiment: null,
    highest_price_24h: null,
    lowest_price_24h: null,
    buys_24h: 0,
    sells_24h: 0,
    startup_mode: false,
    root_prop: parseFloat(raw.root_prop || 0),
    rank: null,
    seven_day_prices: [],       // fetched on-demand via GET /api/sparkline/:netuid
  }
}

// ── Category / description / GPU lookup (for known subnets) ──────────────────
const SUBNET_META = {
  0:  { category: 'infrastructure', description: 'Root network — validator consensus layer' },
  1:  { category: 'nlp',            description: 'Text prompting & LLM inference',                 gpu: true },
  2:  { category: 'ai',             description: 'AI health data & continual learning',             gpu: true },
  3:  { category: 'audio',          description: 'Voice synthesis & TTS generation',                gpu: true },
  4:  { category: 'nlp',            description: 'LLM reasoning & verifiable inference',            gpu: true },
  5:  { category: 'data',           description: 'Web3 social & financial search engine' },
  6:  { category: 'nlp',            description: 'LLM fine-tuning & RLHF',                         gpu: true },
  7:  { category: 'infrastructure', description: 'Decentralized network infrastructure' },
  8:  { category: 'finance',        description: 'Proprietary trading network & forecasting' },
  9:  { category: 'nlp',            description: 'Large language model pretraining',                gpu: true },
  10: { category: 'finance',        description: 'DeFi lending optimization & yield' },
  11: { category: 'audio',          description: 'Audio transcription & speech recognition' },
  12: { category: 'data',           description: 'On-chain analytics & blockchain data' },
  13: { category: 'data',           description: 'Decentralized data storage & retrieval' },
  14: { category: 'security',       description: 'LLM security & adversarial robustness' },
  15: { category: 'infrastructure', description: 'Decentralized validation & verification' },
  16: { category: 'other',          description: 'Decentralized advertising network' },
  17: { category: 'vision',         description: '3D generation, rendering & avatars',              gpu: true },
  18: { category: 'compute',        description: 'Distributed AI compute orchestration',            gpu: true },
  19: { category: 'compute',        description: 'High-throughput AI inference marketplace',        gpu: true },
  20: { category: 'ai',             description: 'Autonomous AI agent framework' },
  21: { category: 'audio',          description: 'AI podcast generation & audio content' },
  22: { category: 'data',           description: 'Decentralized web scraping & data oracle' },
  23: { category: 'nlp',            description: 'Niche topic search & knowledge distillation' },
  24: { category: 'vision',         description: 'Multimodal LLM & video understanding',            gpu: true },
  25: { category: 'science',        description: 'Protein structure prediction & drug discovery',   gpu: true },
  26: { category: 'storage',        description: 'Decentralized redundant data storage' },
  27: { category: 'compute',        description: 'Distributed GPU compute marketplace',             gpu: true },
  28: { category: 'storage',        description: 'Decentralized AI data storage (0G)' },
  29: { category: 'nlp',            description: 'Continual pretraining & cold-start optimization', gpu: true },
  30: { category: 'security',       description: 'Deepfake detection & media authenticity' },
  34: { category: 'nlp',            description: 'Distributed model training & pretraining',        gpu: true },
  37: { category: 'nlp',            description: 'LLM task-specific fine-tuning',                   gpu: true },
  38: { category: 'compute',        description: 'Distributed ML training across GPUs',             gpu: true },
  39: { category: 'compute',        description: 'Edge device ML optimization & pruning',           gpu: true },
  52: { category: 'compute',        description: 'Distributed GPU inference network',               gpu: true },
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

// Bittensor genesis ~2023-03-15, ~12s per block — used to convert block numbers to dates
const GENESIS_MS   = new Date('2023-03-15T00:00:00Z').getTime()
const BLOCK_TIME_MS = 12_000

function blockNumToIso(blockNum) {
  if (!blockNum) return null
  return new Date(GENESIS_MS + blockNum * BLOCK_TIME_MS).toISOString()
}

async function buildSubnetData() {
  // 3 tao.app calls in parallel: screener (all subnet market data) +
  // subnets/info (registration date, owner) + latest block (block height)
  const [screenerJson, infoJson, blocksJson] = await Promise.all([
    apiGet('/api/beta/subnet_screener'),
    apiGet('/api/beta/analytics/subnets/info'),
    apiGet('/api/beta/blocks/latest', { limit: 1 }),
  ])

  // Debug: log full raw shapes so we can find reg_cost / validators / miners field names
  const infoSample = Array.isArray(infoJson) ? infoJson[0] : (infoJson.data || [])[0]
  const screenerSample = Array.isArray(screenerJson) ? screenerJson[0] : (screenerJson.data || [])[0]
  console.log('[info sample FULL]', JSON.stringify(infoSample, null, 2))
  console.log('[screener sample FULL]', JSON.stringify(screenerSample, null, 2))

  // tao.app blocks endpoint may use 'id' or 'number' instead of 'block_number'
  const blockItem = Array.isArray(blocksJson) ? blocksJson[0] : (blocksJson.data?.[0] ?? blocksJson)
  const currentBlock = blockItem?.block_number ?? blockItem?.number ?? blockItem?.id ?? blockItem?.height ?? 0

  // Build info lookup (netuid → info record)
  const infoItems = Array.isArray(infoJson) ? infoJson : (infoJson.data || [])
  const infoMap = new Map()
  for (const s of infoItems) infoMap.set(Number(s.netuid), s)

  // Normalise screener records and merge SUBNET_META enrichment
  const screenerItems = Array.isArray(screenerJson) ? screenerJson : (screenerJson.data || [])
  const data = screenerItems.map(raw => {
    const subnet = normalizeSubnet(raw, infoMap)
    const meta = SUBNET_META[subnet.netuid]
    if (meta) {
      subnet.category    = meta.category
      subnet.description = meta.description
      if (meta.gpu) subnet.gpu_intensive = true
    }
    return subnet
  })

  return {
    data,
    demo: false,
    source: 'tao.app',
    total_subnets: screenerJson.total ?? data.length,
    block_height: currentBlock,
  }
}

// ── GET /api/sparkline/:netuid ────────────────────────────────────────────────
app.get('/api/sparkline/:netuid', async (req, res) => {
  if (!API_KEY) return res.json({ data: [] })
  try {
    const netuid = parseInt(req.params.netuid, 10)
    const end   = new Date()
    const start = new Date(end - 7 * 24 * 60 * 60 * 1000)
    const json  = await apiGet('/api/beta/subnets/ohlc', {
      netuid,
      start: start.toISOString(),
      end:   end.toISOString(),
      interval_minutes: 240,  // 4-hour candles → ~42 points over 7 days
    })
    const items = Array.isArray(json) ? json : (json.data || [])
    const data  = items.map(c => ({ t: c.time_window_unix_ms, price: parseFloat(c.close) }))
    res.json({ data })
  } catch (err) {
    console.error('[Sparkline]', err.message)
    res.json({ data: [] })
  }
})

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
  const mode = API_KEY ? 'LIVE (tao.app API)' : 'DEMO (mock data)'
  console.log(`\n  Bittensor Dashboard  →  http://localhost:${PORT}`)
  console.log(`  Mode: ${mode}\n`)
})
