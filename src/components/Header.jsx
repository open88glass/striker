import { RefreshCw, Wifi, WifiOff, Clock, BarChart2, Activity, Layers, TrendingUp } from 'lucide-react'
import { formatUSD, formatTAO, timeAgo } from '../utils/format.js'

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 rounded-lg bg-violet-600/15 border border-violet-600/20 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-violet-400" />
      </div>
      <div className="min-w-0">
        <p className="text-zinc-500 text-xs uppercase tracking-wide leading-none mb-1 truncate">{label}</p>
        <p className="text-zinc-100 font-semibold text-sm leading-none truncate">{value}</p>
        {sub && <p className="text-zinc-600 text-xs mt-1 leading-none">{sub}</p>}
      </div>
    </div>
  )
}

export default function Header({ stats, isDemo, lastUpdated, onRefresh, refreshing }) {
  return (
    <header className="bg-zinc-950/95 backdrop-blur border-b border-zinc-800/80 sticky top-0 z-40">
      <div className="px-4 sm:px-6 py-3">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-violet-300 font-bold text-lg leading-none">τ</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-100 leading-tight">
                Bittensor Subnet Dashboard
              </h1>
              <p className="text-zinc-500 text-xs leading-tight">Live dTAO subnet analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isDemo ? (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 px-2.5 py-1 rounded-full whitespace-nowrap">
                <WifiOff size={11} />Demo
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/30 px-2.5 py-1 rounded-full whitespace-nowrap">
                <Wifi size={11} />Live
              </span>
            )}

            {lastUpdated && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
                <Clock size={11} />{timeAgo(lastUpdated)}
              </span>
            )}

            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard icon={TrendingUp} label="TAO Price"       value={formatUSD(stats.tao_price_usd)} />
            <StatCard icon={Layers}     label="Total Subnets"   value={stats.total_subnets} />
            <StatCard icon={BarChart2}  label="Total Market Cap" value={formatTAO(stats.total_market_cap_tao, 0)} />
            <StatCard icon={Activity}   label="Block Height"    value={`#${Number(stats.block_height).toLocaleString()}`} sub="~12s / block" />
          </div>
        )}
      </div>
    </header>
  )
}
