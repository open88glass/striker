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
const CACHE_TTL   = 60_000 // 60 s keeps us within 5 req/min (4 Taostats + 1 CoinGecko per cycle)

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
    gpu_intensive: false,              // enriched from SUBNET_META in buildSubnetData
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

async function buildSubnetData() {
  // Parallel: pool + flow + registration cost + pruning/reg-date
  // 4 Taostats calls total — within the 5 req/min free-tier limit
  const [poolJson, flowJson, costJson, pruningJson] = await Promise.all([
    apiGet('/api/dtao/pool/latest/v1',                      { per_page: 300 }),
    apiGet('/api/dtao/tao_flow/v1',                         { per_page: 300 }),
    apiGet('/api/subnet/registration_cost/latest/v1',       { per_page: 300 }).catch(() => null),
    apiGet('/api/subnet/pruning/latest/v1',                 { per_page: 300 }).catch(() => null),
  ])

  const currentBlock  = poolJson.data?.[0]?.block_number ?? 0
  const BLOCK_TIME_MS = 12_000  // ~12 s per block on Bittensor mainnet

  // Build flow lookup (netuid → TAO daily flow)
  const flowMap = new Map()
  for (const f of flowJson.data || []) {
    const netuid = Number(f.netuid)
    // Skip root (netuid 0) — its raw value is anomalous in the flow endpoint
    if (netuid > 0) flowMap.set(netuid, f.tao_flow / RAO)
  }

  // Build registration cost lookup (netuid → TAO)
  // Field name varies across API versions; try common names defensively
  const costMap = new Map()
  for (const c of costJson?.data || []) {
    const rawCost = parseFloat(c.cost ?? c.registration_cost ?? c.burn ?? 0)
    if (rawCost > 0) costMap.set(Number(c.netuid), rawCost / RAO)
  }

  // Build registration-date lookup from pruning endpoint
  // registered_at_block → approximate ISO timestamp via block time
  const pruningMap = new Map()
  for (const p of pruningJson?.data || []) {
    const regBlock = p.registered_at_block || 0
    let registeredAt = null
    if (regBlock > 0 && currentBlock > 0) {
      const blocksAgo = Math.max(0, currentBlock - regBlock)
      registeredAt = new Date(Date.now() - blocksAgo * BLOCK_TIME_MS).toISOString()
    }
    pruningMap.set(Number(p.netuid), { registered_at: registeredAt, registered_block: regBlock })
  }

  // Normalise pool records and merge all supplemental data
  const data = (poolJson.data || []).map(raw => {
    const subnet = normalizePool(raw)
    const meta = SUBNET_META[subnet.netuid]
    if (meta) {
      subnet.category    = meta.category
      subnet.description = meta.description
      if (meta.gpu) subnet.gpu_intensive = true
    }
    if (flowMap.has(subnet.netuid)) {
      subnet.tao_flow_1d = flowMap.get(subnet.netuid)
    }
    if (costMap.has(subnet.netuid)) {
      subnet.reg_cost_tao = costMap.get(subnet.netuid)
    }
    const pruning = pruningMap.get(subnet.netuid)
    if (pruning) {
      subnet.registered_at    = pruning.registered_at
      subnet.registered_block = pruning.registered_block
    }
    return subnet
  })

  return {
    data,
    demo: false,
    source: 'taostats',
    // Expose pagination meta so /api/stats can reuse this without an extra API call
    total_subnets: poolJson.pagination?.total_items ?? data.length,
    block_height: currentBlock,
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
