import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header.jsx'
import SubnetTable from './components/SubnetTable.jsx'
import SubnetModal from './components/SubnetModal.jsx'
import { fetchSubnets, fetchStats } from './utils/api.js'

const REFRESH_MS = 30_000

export default function App() {
  const [subnets, setSubnets] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDemo, setIsDemo] = useState(false)
  const [selectedSubnet, setSelectedSubnet] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef(null)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const [subnetRes, statsRes] = await Promise.all([fetchSubnets(), fetchStats()])
      const subnets = subnetRes.data ?? []
      setSubnets(subnets)
      setIsDemo(subnetRes.demo ?? false)

      // Compute aggregate stats from live subnet data
      const totalMC  = subnets.reduce((sum, s) => sum + (s.market_cap_tao || 0), 0)
      const totalVol = subnets.reduce((sum, s) => sum + (s.volume_24h_tao  || 0), 0)
      setStats({
        ...statsRes,
        total_subnets: subnets.length,
        total_market_cap_tao: totalMC  > 0 ? totalMC  : statsRes.total_market_cap_tao,
        total_volume_24h_tao: totalVol > 0 ? totalVol : statsRes.total_volume_24h_tao,
      })

      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(() => load(), REFRESH_MS)
    return () => clearInterval(intervalRef.current)
  }, [load])

  // Close modal with Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') setSelectedSubnet(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin" />
        <p className="text-zinc-500 text-sm">Fetching subnet data…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header
        stats={stats}
        isDemo={isDemo}
        lastUpdated={lastUpdated}
        onRefresh={() => load(true)}
        refreshing={refreshing}
      />

      <main className="px-4 sm:px-6 py-5 max-w-[1700px] mx-auto">
        {error && (
          <div className="mb-4 px-4 py-3 bg-rose-900/20 border border-rose-700/40 rounded-xl text-rose-400 text-sm flex items-center gap-2">
            <span className="text-rose-500 flex-shrink-0">✕</span>{error}
          </div>
        )}

        {isDemo && (
          <div className="mb-4 px-4 py-3 bg-amber-900/15 border border-amber-700/30 rounded-xl text-amber-400/80 text-sm flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">⚠</span>
            <span>
              <strong className="text-amber-400">Demo mode</strong> — mock data with realistic values.
              Add your <code className="bg-zinc-800 px-1 rounded text-amber-300 text-xs">TAO_APP_API_KEY</code> to{' '}
              <code className="bg-zinc-800 px-1 rounded text-amber-300 text-xs">.env</code> for live Bittensor data
              (get a key at <span className="underline decoration-dotted">tao.app</span>).
            </span>
          </div>
        )}

        <SubnetTable subnets={subnets} onSelectSubnet={setSelectedSubnet} />
      </main>

      {selectedSubnet && (
        <SubnetModal subnet={selectedSubnet} onClose={() => setSelectedSubnet(null)} />
      )}
    </div>
  )
}
