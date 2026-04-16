export async function fetchSubnets() {
  const res = await fetch('/api/subnets')
  if (!res.ok) throw new Error(`Failed to fetch subnets: ${res.status}`)
  return res.json()
}

export async function fetchStats() {
  const res = await fetch('/api/stats')
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`)
  return res.json()
}

export async function fetchSparkline(netuid) {
  const res = await fetch(`/api/sparkline/${netuid}`)
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}
