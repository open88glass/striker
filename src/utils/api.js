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
