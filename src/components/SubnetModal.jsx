import {
  X, ExternalLink, Cpu, Users, Activity, TrendingUp,
  TrendingDown, DollarSign, Calendar, Hash, Shield, Zap, BarChart2,
} from 'lucide-react'
import { formatTAO, formatPct, formatDate, formatBlock, truncateAddress } from '../utils/format.js'

const CAT_STYLE = {
  nlp:            'bg-blue-900/30 text-blue-400 border-blue-700/30',
  vision:         'bg-purple-900/30 text-purple-400 border-purple-700/30',
  audio:          'bg-pink-900/30 text-pink-400 border-pink-700/30',
  compute:        'bg-orange-900/30 text-orange-400 border-orange-700/30',
  storage:        'bg-yellow-900/30 text-yellow-400 border-yellow-700/30',
  data:           'bg-cyan-900/30 text-cyan-400 border-cyan-700/30',
  finance:        'bg-green-900/30 text-green-400 border-green-700/30',
  science:        'bg-teal-900/30 text-teal-400 border-teal-700/30',
  security:       'bg-red-900/30 text-red-400 border-red-700/30',
  infrastructure: 'bg-zinc-800 text-zinc-400 border-zinc-600',
  ai:             'bg-violet-900/30 text-violet-400 border-violet-700/30',
  other:          'bg-zinc-800 text-zinc-500 border-zinc-600',
}

const FG_COLORS = {
  'extreme fear': '#ef4444',
  'fear':         '#f97316',
  'neutral':      '#a3a3a3',
  'greed':        '#22c55e',
  'extreme greed':'#10b981',
}

// Pure-SVG sparkline — no extra dependencies
function Sparkline({ prices, w = 200, h = 50 }) {
  if (!prices || prices.length < 2) return null
  const vals = prices.map(p => p.price)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const positive = vals[vals.length - 1] >= vals[0]
  const pts = vals
    .map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`)
    .join(' ')
  const color = positive ? '#34d399' : '#fb7185'
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={parseFloat(pts.split(' ').pop().split(',')[0])}
        cy={parseFloat(pts.split(' ').pop().split(',')[1])}
        r="3" fill={color}
      />
    </svg>
  )
}

function MetricBox({ label, value, sub }) {
  return (
    <div className="bg-zinc-800/50 rounded-lg px-3 py-3">
      <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-semibold font-mono text-zinc-100">{value}</p>
      {sub && <div className="text-xs mt-0.5">{sub}</div>}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-500 text-xs flex items-center gap-1.5">
        <Icon size={13} />{label}
      </span>
      <span className={`text-xs font-medium ${mono ? 'font-mono text-zinc-300' : 'text-zinc-200'}`}>
        {value}
      </span>
    </div>
  )
}

export default function SubnetModal({ subnet, onClose }) {
  if (!subnet) return null

  const pos1d = subnet.price_change_1d >= 0
  const pos7d = subnet.price_change_7d >= 0
  const catStyle = CAT_STYLE[subnet.category] ?? CAT_STYLE.other
  const fgColor = FG_COLORS[subnet.fear_and_greed_sentiment?.toLowerCase()] ?? '#a3a3a3'
  const hasPriceHistory = subnet.seven_day_prices?.length > 1

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────── */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-violet-600/15 border border-violet-600/25 flex items-center justify-center flex-shrink-0">
              <span className="text-violet-300 font-bold text-sm">{subnet.netuid}</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h2 className="text-lg font-semibold text-zinc-100 truncate">{subnet.name}</h2>
                <span className="text-zinc-500 text-sm font-mono flex-shrink-0">{subnet.symbol}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${
                  subnet.status === 'active'
                    ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40'
                    : subnet.status === 'startup'
                    ? 'bg-amber-900/30 text-amber-400 border-amber-700/40'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    subnet.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                    subnet.status === 'startup' ? 'bg-amber-400' : 'bg-zinc-500'
                  }`} />
                  {subnet.status}
                </span>
                {subnet.category !== 'other' && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${catStyle}`}>
                    {subnet.category}
                  </span>
                )}
              </div>
              {subnet.description && <p className="text-zinc-400 text-sm truncate">{subnet.description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors ml-2 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* ── 7-Day Price Chart ─────────────────────────── */}
        {hasPriceHistory && (
          <div className="px-5 pt-4 pb-2 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-600 text-xs uppercase tracking-widest flex items-center gap-1">
                <BarChart2 size={11} />7-Day Price
              </p>
              <span className={`text-xs font-mono font-medium ${pos7d ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pos7d ? '+' : ''}{subnet.price_change_7d?.toFixed(2)}%
              </span>
            </div>
            <Sparkline prices={subnet.seven_day_prices} w={580} h={60} />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>{subnet.seven_day_prices[0] ? new Date(subnet.seven_day_prices[0].t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
              <span>Now: {formatTAO(subnet.price_tao, 6)}</span>
            </div>
          </div>
        )}

        {/* ── Market Metrics ────────────────────────────── */}
        <div className="p-5 border-b border-zinc-800">
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-3">Market</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <MetricBox
              label="Price"
              value={formatTAO(subnet.price_tao, 6)}
              sub={<span className={`font-mono ${pos1d ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pos1d ? '+' : ''}{subnet.price_change_1d?.toFixed(2)}% (24H)
              </span>}
            />
            <MetricBox label="Market Cap" value={formatTAO(subnet.market_cap_tao, 0)} />
            <MetricBox label="Volume (24H)" value={formatTAO(subnet.volume_24h_tao, 0)} />
            <MetricBox label="TAO In Pool" value={formatTAO(subnet.tao_in, 0)} />
            <MetricBox
              label="24H Range"
              value={
                subnet.lowest_price_24h && subnet.highest_price_24h
                  ? `${formatTAO(subnet.lowest_price_24h, 4)} – ${formatTAO(subnet.highest_price_24h, 4)}`
                  : '—'
              }
            />
            <MetricBox
              label="Buys / Sells"
              value={`${subnet.buys_24h} / ${subnet.sells_24h}`}
              sub={<span className="text-zinc-500 text-xs">24H transactions</span>}
            />
          </div>

          {/* Buy/sell bar */}
          {(subnet.buys_24h + subnet.sells_24h) > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span className="text-emerald-400">Buy {formatTAO(subnet.buy_volume_24h_tao, 0)}</span>
                <span className="text-rose-400">Sell {formatTAO(subnet.sell_volume_24h_tao, 0)}</span>
              </div>
              <div className="h-1.5 bg-rose-500/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500/70 rounded-full"
                  style={{
                    width: `${subnet.buy_volume_24h_tao + subnet.sell_volume_24h_tao > 0
                      ? (subnet.buy_volume_24h_tao / (subnet.buy_volume_24h_tao + subnet.sell_volume_24h_tao)) * 100
                      : 50}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Fear & Greed / TAO Flow / Change grid ─────── */}
        <div className="grid sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60 border-b border-zinc-800">
          {/* Fear & Greed */}
          <div className="p-4 text-center">
            <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">Fear & Greed</p>
            {subnet.fear_and_greed != null ? (
              <>
                <p className="text-2xl font-bold font-mono" style={{ color: fgColor }}>
                  {subnet.fear_and_greed}
                </p>
                <p className="text-xs capitalize mt-0.5" style={{ color: fgColor }}>
                  {subnet.fear_and_greed_sentiment || '—'}
                </p>
              </>
            ) : (
              <p className="text-zinc-600 text-sm mt-2">N/A</p>
            )}
          </div>

          {/* Price Changes */}
          <div className="p-4">
            <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">Price Change</p>
            {[
              ['1H',  subnet.price_change_1h],
              ['24H', subnet.price_change_1d],
              ['7D',  subnet.price_change_7d],
              ['1M',  subnet.price_change_1m],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between py-0.5">
                <span className="text-zinc-500 text-xs">{label}</span>
                <span className={`font-mono text-xs font-medium ${(val ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {val != null ? formatPct(val) : '—'}
                </span>
              </div>
            ))}
          </div>

          {/* TAO Flow */}
          <div className="p-4">
            <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">TAO Flow</p>
            {[
              ['24H Flow', subnet.tao_flow_1d],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between py-0.5">
                <span className="text-zinc-500 text-xs">{label}</span>
                <span className={`font-mono text-xs font-medium ${(val ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {val != null ? (val >= 0 ? '+' : '') + formatTAO(val, 2) : '—'}
                </span>
              </div>
            ))}
            <div className="mt-2 text-zinc-600 text-xs">
              <p>Root share: {(subnet.root_prop * 100).toFixed(2)}%</p>
              {subnet.gpu_intensive && (
                <p className="flex items-center gap-1 text-violet-400 mt-1">
                  <Cpu size={12} /> GPU intensive
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Network / Registration ────────────────────── */}
        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60">
          <div className="p-5">
            <p className="text-zinc-600 text-xs uppercase tracking-widest mb-3">Network</p>
            <InfoRow icon={Users}    label="Validators"    value={subnet.validators || '—'} />
            <InfoRow icon={Activity} label="Miners"        value={subnet.miners || '—'} />
            <InfoRow icon={Hash}     label="Total Neurons" value={subnet.neurons || '—'} />
            <InfoRow icon={Cpu}      label="GPU Intensive" value={subnet.gpu_intensive ? 'Yes' : 'No'} />
          </div>
          <div className="p-5">
            <p className="text-zinc-600 text-xs uppercase tracking-widest mb-3">Registration</p>
            <InfoRow icon={Calendar}   label="Registered"  value={subnet.registered_at ? formatDate(subnet.registered_at) : '—'} />
            <InfoRow icon={Hash}       label="Block"       value={subnet.registered_block ? formatBlock(subnet.registered_block) : '—'} mono />
            <InfoRow icon={DollarSign} label="Reg. Cost"   value={subnet.reg_cost_tao ? formatTAO(subnet.reg_cost_tao, 4) : '—'} />
            <InfoRow icon={Shield}     label="Owner"       value={subnet.owner ? truncateAddress(subnet.owner, 7) : '—'} mono />
          </div>
        </div>

        {/* ── Links ─────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-zinc-800 flex flex-wrap gap-4">
          {[
            [`https://taostats.io/subnets/${subnet.netuid}`, 'Taostats'],
            [`https://www.tensor.io/subnet/${subnet.netuid}`, 'Tensor.io'],
          ].map(([href, label]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors">
              <ExternalLink size={13} />{label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
