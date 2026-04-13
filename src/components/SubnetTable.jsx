import { useState, useMemo } from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, Cpu, TrendingUp, TrendingDown, SlidersHorizontal,
} from 'lucide-react'
import { formatTAO, formatPct, formatDate } from '../utils/format.js'

const COLUMNS = [
  { key: 'rank',           label: '#',           sortable: true  },
  { key: 'name',           label: 'Name',         sortable: true  },
  { key: 'status',         label: 'Status',       sortable: true  },
  { key: 'price_tao',      label: 'Price (τ)',    sortable: true  },
  { key: 'price_change_1d',label: '24H',          sortable: true  },
  { key: 'seven_day_chart',label: '7D Chart',     sortable: false },
  { key: 'market_cap_tao', label: 'Market Cap',   sortable: true  },
  { key: 'volume_24h_tao', label: 'Volume 24H',   sortable: true  },
  { key: 'tao_in',         label: 'TAO In Pool',  sortable: true  },
  { key: 'reg_cost_tao',   label: 'Reg. Cost',    sortable: true  },
  { key: 'registered_at',  label: 'Reg. Date',    sortable: true  },
  { key: 'validators',     label: 'Validators',   sortable: true  },
  { key: 'miners',         label: 'Miners',       sortable: true  },
  { key: 'gpu_intensive',  label: 'GPU',          sortable: false },
]

const CATEGORIES = ['all', 'nlp', 'vision', 'audio', 'compute', 'storage', 'data', 'finance', 'science', 'security', 'ai', 'infrastructure', 'other']

// Tiny SVG sparkline for the 7-day price history
function MiniSparkline({ prices }) {
  if (!prices || prices.length < 2) return <span className="text-zinc-700 text-xs">—</span>
  const vals = prices.map(p => p.price)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const W = 56, H = 20
  const pts = vals
    .map((v, i) => `${((i / (vals.length - 1)) * W).toFixed(1)},${(H - ((v - min) / range) * (H - 2) - 1).toFixed(1)}`)
    .join(' ')
  const positive = vals[vals.length - 1] >= vals[0]
  return (
    <svg width={W} height={H} className="overflow-visible block">
      <polyline points={pts} fill="none"
        stroke={positive ? '#34d399' : '#fb7185'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SortIcon({ col, sortKey, sortDir }) {
  if (!col.sortable) return null
  if (sortKey !== col.key) return <ChevronsUpDown size={12} className="text-zinc-700 shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-violet-400 shrink-0" />
    : <ChevronDown size={12} className="text-violet-400 shrink-0" />
}

export default function SubnetTable({ subnets, onSelectSubnet }) {
  const [sortKey, setSortKey] = useState('rank')
  const [sortDir, setSortDir] = useState('asc')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showCatFilter, setShowCatFilter] = useState(false)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return subnets
      .filter(s => {
        if (q && !s.name.toLowerCase().includes(q) && !s.symbol.toLowerCase().includes(q) && !String(s.netuid).includes(q)) return false
        if (statusFilter !== 'all' && s.status !== statusFilter) return false
        if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
        return true
      })
      .sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (sortKey === 'registered_at') {
          const aDate = av ? new Date(av) : new Date(0)
          const bDate = bv ? new Date(bv) : new Date(0)
          return sortDir === 'asc' ? aDate - bDate : bDate - aDate
        }
        if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv ?? '') : (bv ?? '').localeCompare(av)
        if (typeof av === 'boolean') return sortDir === 'asc' ? (av ? 1 : 0) - (bv ? 1 : 0) : (bv ? 1 : 0) - (av ? 1 : 0)
        const an = av ?? 0, bn = bv ?? 0
        return sortDir === 'asc' ? an - bn : bn - an
      })
  }, [subnets, search, statusFilter, categoryFilter, sortKey, sortDir])

  const statusOptions = ['all', ...new Set(subnets.map(s => s.status).filter(Boolean))]

  return (
    <div className="space-y-3">
      {/* ── Filter bar ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Name, symbol or #…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors w-52"
          />
        </div>

        {statusOptions.map(s => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {s}
          </button>
        ))}

        <button
          onClick={() => setShowCatFilter(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            categoryFilter !== 'all'
              ? 'bg-violet-600 text-white'
              : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          <SlidersHorizontal size={13} />
          {categoryFilter !== 'all' ? categoryFilter : 'Category'}
        </button>

        <span className="text-zinc-600 text-xs ml-auto">
          {filtered.length} / {subnets.length} subnets
        </span>
      </div>

      {showCatFilter && (
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button key={cat}
              onClick={() => { setCategoryFilter(cat); setShowCatFilter(false) }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                categoryFilter === cat
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[1200px] text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-zinc-800">
              {COLUMNS.map(col => (
                <th key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap
                    ${col.sortable ? 'cursor-pointer hover:text-zinc-300 select-none' : ''}`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-12 text-zinc-600">
                  No subnets match your filters.
                </td>
              </tr>
            )}

            {filtered.map(s => {
              const pos = s.price_change_1d >= 0
              return (
                <tr key={s.netuid}
                  onClick={() => onSelectSubnet(s)}
                  className="border-b border-zinc-800/40 hover:bg-zinc-800/20 cursor-pointer transition-colors group"
                >
                  {/* Rank / # */}
                  <td className="px-3 py-3">
                    <span className="text-zinc-500 font-mono text-xs">
                      {s.rank != null ? s.rank : s.netuid}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="px-3 py-3">
                    <div>
                      <p className="font-medium text-zinc-100 group-hover:text-violet-300 transition-colors leading-tight text-sm">
                        {s.name}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">SN{s.netuid}</p>
                      <p className="text-xs text-zinc-600 font-mono">{s.symbol}</p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                      s.status === 'active'
                        ? 'bg-emerald-900/20 text-emerald-400 border-emerald-700/30'
                        : s.status === 'startup'
                        ? 'bg-amber-900/20 text-amber-400 border-amber-700/30'
                        : 'bg-zinc-800/60 text-zinc-500 border-zinc-700/50'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        s.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                        s.status === 'startup' ? 'bg-amber-400' : 'bg-zinc-600'
                      }`} />
                      {s.status}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-3 py-3">
                    <span className="font-mono text-zinc-200 text-xs">{formatTAO(s.price_tao, 4)}</span>
                  </td>

                  {/* 24H change */}
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {formatPct(s.price_change_1d)}
                    </span>
                  </td>

                  {/* 7D sparkline */}
                  <td className="px-3 py-3">
                    <MiniSparkline prices={s.seven_day_prices} />
                  </td>

                  {/* Market Cap */}
                  <td className="px-3 py-3">
                    <span className="font-mono text-zinc-300 text-xs">{formatTAO(s.market_cap_tao, 0)}</span>
                  </td>

                  {/* Volume */}
                  <td className="px-3 py-3">
                    <span className="font-mono text-zinc-500 text-xs">{formatTAO(s.volume_24h_tao, 0)}</span>
                  </td>

                  {/* TAO in pool */}
                  <td className="px-3 py-3">
                    <span className="font-mono text-zinc-400 text-xs">{formatTAO(s.tao_in, 0)}</span>
                  </td>

                  {/* Reg. Cost */}
                  <td className="px-3 py-3">
                    <span className="font-mono text-zinc-400 text-xs">
                      {s.reg_cost_tao > 0 ? formatTAO(s.reg_cost_tao, 4) : '—'}
                    </span>
                  </td>

                  {/* Reg. Date */}
                  <td className="px-3 py-3">
                    <span className="text-xs text-zinc-500">
                      {s.registered_at ? formatDate(s.registered_at) : '—'}
                    </span>
                  </td>

                  {/* Validators */}
                  <td className="px-3 py-3">
                    <span className="text-zinc-400 text-xs">{s.validators > 0 ? s.validators : '—'}</span>
                  </td>

                  {/* Miners */}
                  <td className="px-3 py-3">
                    <span className="text-zinc-400 text-xs">{s.miners > 0 ? s.miners : '—'}</span>
                  </td>

                  {/* GPU */}
                  <td className="px-3 py-3">
                    {s.gpu_intensive && <Cpu size={14} className="text-violet-400" title="GPU intensive" />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
