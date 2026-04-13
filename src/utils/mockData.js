// Seeded pseudo-random number generator (LCG) for deterministic mock data
function seededRng(seed) {
  let s = (seed * 1664525 + 1013904223) >>> 0
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

const GPU_INTENSIVE = new Set([1, 2, 3, 4, 6, 9, 17, 18, 19, 24, 25, 27, 29, 34, 37, 38, 39, 52])

// Known subnets metadata
const SUBNETS_META = [
  { netuid: 0,  name: 'Root',              symbol: 'ROOT',   description: 'Root network — validator consensus layer',          category: 'infrastructure', emission: 0 },
  { netuid: 1,  name: 'Apex',              symbol: 'APEX',   description: 'Text prompting & LLM inference',                    category: 'nlp',            emission: 8.2 },
  { netuid: 2,  name: 'Omron',             symbol: 'OMRON',  description: 'AI health data & continual learning',               category: 'ai',             emission: 3.1 },
  { netuid: 3,  name: 'MyShell',           symbol: 'SHELL',  description: 'Voice synthesis & TTS generation',                  category: 'audio',          emission: 2.8 },
  { netuid: 4,  name: 'Targon',            symbol: 'TARG',   description: 'LLM reasoning & verifiable inference',              category: 'nlp',            emission: 5.4 },
  { netuid: 5,  name: 'Open Kaito',        symbol: 'KAITO',  description: 'Web3 social & financial search engine',             category: 'data',           emission: 2.1 },
  { netuid: 6,  name: 'Nous Research',     symbol: 'NOUS',   description: 'LLM fine-tuning & RLHF',                            category: 'nlp',            emission: 4.7 },
  { netuid: 7,  name: 'SubVortex',         symbol: 'SV',     description: 'Decentralized network infrastructure',              category: 'infrastructure', emission: 1.9 },
  { netuid: 8,  name: 'PTN',               symbol: 'PTN',    description: 'Proprietary trading network & forecasting',         category: 'finance',        emission: 3.6 },
  { netuid: 9,  name: 'Pretraining',       symbol: 'PRE',    description: 'Large language model pretraining',                  category: 'nlp',            emission: 6.3 },
  { netuid: 10, name: 'Sturdy',            symbol: 'STRD',   description: 'DeFi lending optimization & yield',                 category: 'finance',        emission: 1.8 },
  { netuid: 11, name: 'Dipole',            symbol: 'DIP',    description: 'Audio transcription & speech recognition',          category: 'audio',          emission: 1.5 },
  { netuid: 12, name: 'Explorer',          symbol: 'EXPL',   description: 'On-chain analytics & blockchain data',              category: 'data',           emission: 1.2 },
  { netuid: 13, name: 'Dataverse',         symbol: 'DATA',   description: 'Decentralized data storage & retrieval',            category: 'data',           emission: 1.4 },
  { netuid: 14, name: 'LLM Defender',      symbol: 'LLMD',   description: 'LLM security & adversarial robustness',             category: 'security',       emission: 1.1 },
  { netuid: 15, name: 'de_val',            symbol: 'DVAL',   description: 'Decentralized validation & verification',           category: 'infrastructure', emission: 0.9 },
  { netuid: 16, name: 'BitAds',            symbol: 'BADS',   description: 'Decentralized advertising network',                 category: 'other',          emission: 1.3 },
  { netuid: 17, name: '3Gen',              symbol: '3GEN',   description: '3D generation, rendering & avatars',                category: 'vision',         emission: 2.0 },
  { netuid: 18, name: 'Cortex.t',          symbol: 'CORT',   description: 'Distributed AI compute orchestration',              category: 'compute',        emission: 3.2 },
  { netuid: 19, name: 'Inference',         symbol: 'INFER',  description: 'High-throughput AI inference marketplace',          category: 'compute',        emission: 4.1 },
  { netuid: 20, name: 'BitAgent',          symbol: 'BAGT',   description: 'Autonomous AI agent framework',                     category: 'ai',             emission: 2.5 },
  { netuid: 21, name: 'Any Podcast',       symbol: 'POD',    description: 'AI podcast generation & audio content',             category: 'audio',          emission: 0.8 },
  { netuid: 22, name: 'Datura',            symbol: 'DAT',    description: 'Decentralized web scraping & data oracle',          category: 'data',           emission: 1.6 },
  { netuid: 23, name: 'NicheBrain',        symbol: 'NICHE',  description: 'Niche topic search & knowledge distillation',       category: 'nlp',            emission: 0.7 },
  { netuid: 24, name: 'Omega Labs',        symbol: 'OMEGA',  description: 'Multimodal LLM & video understanding',              category: 'vision',         emission: 3.4 },
  { netuid: 25, name: 'Protein Folding',   symbol: 'PROT',   description: 'Protein structure prediction & drug discovery',     category: 'science',        emission: 2.2 },
  { netuid: 26, name: 'Storage',           symbol: 'STOR',   description: 'Decentralized redundant data storage',              category: 'storage',        emission: 2.7 },
  { netuid: 27, name: 'Compute',           symbol: 'COMP',   description: 'Distributed GPU compute marketplace',               category: 'compute',        emission: 5.1 },
  { netuid: 28, name: 'ZeroGravity',       symbol: 'ZG',     description: 'Decentralized AI data storage (0G)',                category: 'storage',        emission: 1.7 },
  { netuid: 29, name: 'Coldint',           symbol: 'COLD',   description: 'Continual pretraining & cold-start optimization',   category: 'nlp',            emission: 1.0 },
  { netuid: 30, name: 'BitMind',           symbol: 'BMIN',   description: 'Deepfake detection & media authenticity',           category: 'security',       emission: 1.3 },
  { netuid: 31, name: 'Healthcare',        symbol: 'HLTH',   description: 'Medical AI & clinical decision support',            category: 'science',        emission: 1.1 },
  { netuid: 32, name: 'Bet Placement',     symbol: 'BET',    description: 'Sports prediction & outcome forecasting',           category: 'finance',        emission: 0.6 },
  { netuid: 33, name: 'Cerebras',          symbol: 'CER',    description: 'Foundation model distributed training',             category: 'nlp',            emission: 2.9 },
  { netuid: 34, name: 'Mind\'s Eye',       symbol: 'MEYE',   description: 'Image generation & multimodal reasoning',           category: 'vision',         emission: 1.8 },
  { netuid: 35, name: 'LogicNet',          symbol: 'LOGIC',  description: 'Mathematical reasoning & theorem proving',          category: 'nlp',            emission: 0.9 },
  { netuid: 36, name: 'HIP',               symbol: 'HIP',    description: 'Human intelligence primitives & RLHF',              category: 'ai',             emission: 0.8 },
  { netuid: 37, name: 'Fine-Tuning',       symbol: 'FT',     description: 'LLM task-specific fine-tuning',                     category: 'nlp',            emission: 2.1 },
  { netuid: 38, name: 'Distrib. Training', symbol: 'DTRN',   description: 'Distributed ML training across GPUs',               category: 'compute',        emission: 2.4 },
  { netuid: 39, name: 'EdgeMaxxing',       symbol: 'EDGE',   description: 'Edge device ML optimization & pruning',             category: 'compute',        emission: 1.2 },
  { netuid: 40, name: 'Chunking',          symbol: 'CHUNK',  description: 'Document parsing & intelligent chunking',           category: 'data',           emission: 0.7 },
  { netuid: 41, name: 'Sportstensor',      symbol: 'SPORT',  description: 'Sports analytics & performance prediction',         category: 'finance',        emission: 0.6 },
  { netuid: 42, name: 'Masa',              symbol: 'MASA',   description: 'Decentralized data oracle & social graph',          category: 'data',           emission: 1.5 },
  { netuid: 43, name: 'Graphite',          symbol: 'GRPH',   description: 'Graph problem optimization & routing',              category: 'ai',             emission: 0.5 },
  { netuid: 44, name: 'Score Predict',     symbol: 'SCORE',  description: 'Real-time event score prediction',                  category: 'finance',        emission: 0.4 },
  { netuid: 45, name: 'Gen42',             symbol: 'GEN42',  description: 'Code generation & AI programming assistant',        category: 'nlp',            emission: 1.4 },
  { netuid: 46, name: 'Neurobiology',      symbol: 'NEURO',  description: 'Neuroscience research & brain-computer interface',  category: 'science',        emission: 0.5 },
  { netuid: 47, name: 'Condense AI',       symbol: 'COND',   description: 'Text compression & summarization',                  category: 'nlp',            emission: 0.6 },
  { netuid: 48, name: 'Nextplace',         symbol: 'NXP',    description: 'Real estate valuation & market prediction',         category: 'finance',        emission: 0.7 },
  { netuid: 49, name: 'AutoML',            symbol: 'ATML',   description: 'Automated machine learning & hyperparameter opt.',  category: 'ai',             emission: 0.8 },
  { netuid: 50, name: 'Morpheus',          symbol: 'MORPH',  description: 'Decentralized AI assistant & agents',               category: 'ai',             emission: 1.6 },
  { netuid: 51, name: 'Celium',            symbol: 'CEL',    description: 'GPU compute marketplace & rental',                  category: 'compute',        emission: 1.9 },
  { netuid: 52, name: 'Dojo',              symbol: 'DOJO',   description: 'AI training data generation & curation',            category: 'data',           emission: 2.3 },
  { netuid: 53, name: 'SocialTensor',      symbol: 'SOC',    description: 'Social media AI & content moderation',              category: 'ai',             emission: 0.9 },
  { netuid: 54, name: 'Autonomous',        symbol: 'AUTO',   description: 'Autonomous driving & robotics AI',                  category: 'vision',         emission: 1.1 },
  { netuid: 55, name: 'BitReview',         symbol: 'BREV',   description: 'Automated code review & quality analysis',          category: 'nlp',            emission: 0.5 },
  { netuid: 56, name: 'Gradients',         symbol: 'GRAD',   description: 'Gradient optimization & ML training efficiency',    category: 'compute',        emission: 0.7 },
  { netuid: 57, name: 'Gaia',              symbol: 'GAIA',   description: 'Environmental monitoring & climate AI',             category: 'science',        emission: 0.6 },
  { netuid: 58, name: 'Synapse',           symbol: 'SYN',    description: 'Neural signal processing & brain data',             category: 'science',        emission: 0.4 },
  { netuid: 59, name: 'Agent Arena',       symbol: 'ARENA',  description: 'AI agent competition & benchmark evaluation',       category: 'ai',             emission: 0.8 },
  { netuid: 60, name: 'Yield Mosaic',      symbol: 'YIELD',  description: 'Cross-chain yield optimization & DeFi',             category: 'finance',        emission: 0.5 },
  { netuid: 61, name: 'RedTeam',           symbol: 'RED',    description: 'AI red teaming & safety testing',                   category: 'security',       emission: 0.6 },
  { netuid: 62, name: 'Agentao',           symbol: 'AGNT',   description: 'Autonomous task-solving AI agents',                 category: 'ai',             emission: 1.0 },
  { netuid: 63, name: 'Amberlabs',         symbol: 'AMBL',   description: 'ML infrastructure & tooling',                       category: 'infrastructure', emission: 0.5 },
]

// Base prices for well-known subnets (in TAO)
const BASE_PRICES = {
  0: 0,    // Root has no tradable token
  1: 1.84, 4: 1.22, 9: 2.11, 27: 1.67, 19: 0.93,
  18: 0.78, 6: 1.45, 25: 0.88, 2: 0.55, 24: 1.12,
}

// Genesis block ~March 2023. Blocks every ~12 seconds.
const GENESIS_DATE = new Date('2023-03-15T00:00:00Z')
const BLOCK_TIME_S = 12

function blockToDate(blockNum) {
  const ms = GENESIS_DATE.getTime() + blockNum * BLOCK_TIME_S * 1000
  return new Date(ms).toISOString()
}

export function generateMockData() {
  return SUBNETS_META.map((meta) => {
    const rng = seededRng(meta.netuid * 31337 + 99991)

    // Price
    const basePrice = BASE_PRICES[meta.netuid] ?? (0.05 + rng() * 1.5)
    const priceTao = meta.netuid === 0 ? 1.0 : parseFloat((basePrice * (0.95 + rng() * 0.1)).toFixed(6))

    // Market cap — circulating / total supply
    const totalSupply = 21_000_000
    const circulatingRatio = 0.25 + rng() * 0.55
    const marketCapTao = meta.netuid === 0 ? 0 : parseFloat((priceTao * totalSupply * circulatingRatio).toFixed(2))

    // Volume 24H (2–12% of market cap)
    const volume24hTao = parseFloat((marketCapTao * (0.02 + rng() * 0.1)).toFixed(2))

    // Emission (use predefined, add small noise)
    const emissionPct = parseFloat((meta.emission * (0.95 + rng() * 0.1)).toFixed(4))

    // TAO in pool (AMM liquidity)
    const taoIn = parseFloat((marketCapTao * (0.3 + rng() * 0.4)).toFixed(2))

    // Registration cost (min burn)
    const regCostTao = parseFloat((0.08 + rng() * 1.2).toFixed(4))

    // Registration block & date
    // Subnets came online progressively: ~50k blocks apart on average
    const regBlock = 50_000 + meta.netuid * 48_000 + Math.floor(rng() * 8_000)
    const registeredAt = blockToDate(regBlock)

    // Network participants
    const validators = Math.floor(15 + rng() * 95)  // 15–110
    const miners = Math.floor(40 + rng() * 460)      // 40–500

    // Price changes
    const priceChange1d = parseFloat(((rng() - 0.5) * 22).toFixed(2))
    const priceChange7d = parseFloat(((rng() - 0.45) * 40).toFixed(2))
    const taoFlow1d = parseFloat(((rng() - 0.4) * volume24hTao * 0.3).toFixed(2))
    const taoFlow7d = parseFloat(((rng() - 0.4) * volume24hTao * 1.8).toFixed(2))

    // Status — subnet 0 always active; ~8% of others inactive
    const status = meta.netuid === 0 || rng() > 0.08 ? 'active' : 'inactive'

    // Owner address (mock SS58)
    const prefix = ['5D', '5E', '5F', '5G', '5H'][Math.floor(rng() * 5)]
    const ownerSuffix = Array.from({ length: 46 }, () =>
      '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(rng() * 58)]
    ).join('')
    const owner = prefix + ownerSuffix

    return {
      netuid: meta.netuid,
      name: meta.name,
      symbol: meta.symbol,
      description: meta.description,
      category: meta.category,
      status,
      price_tao: priceTao,
      market_cap_tao: marketCapTao,
      volume_24h_tao: volume24hTao,
      emission_pct: emissionPct,
      tao_in: taoIn,
      reg_cost_tao: regCostTao,
      registered_at: registeredAt,
      registered_block: regBlock,
      validators,
      miners,
      neurons: validators + miners,
      price_change_1d: priceChange1d,
      price_change_7d: priceChange7d,
      tao_flow_1d: taoFlow1d,
      tao_flow_7d: taoFlow7d,
      owner,
      gpu_intensive: GPU_INTENSIVE.has(meta.netuid),
    }
  })
}
