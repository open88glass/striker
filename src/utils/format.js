export function formatTAO(amount, decimals = 4) {
  if (amount == null || amount === 0) return '0 τ'
  const abs = Math.abs(amount)
  let str
  if (abs >= 1_000_000) str = (amount / 1_000_000).toFixed(2) + 'M'
  else if (abs >= 1_000) str = (amount / 1_000).toFixed(2) + 'K'
  else str = amount.toFixed(decimals)
  return str + ' τ'
}

export function formatUSD(amount) {
  if (amount == null || amount === 0) return '$0'
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000) return '$' + (amount / 1_000_000_000).toFixed(2) + 'B'
  if (abs >= 1_000_000) return '$' + (amount / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return '$' + (amount / 1_000).toFixed(2) + 'K'
  return '$' + amount.toFixed(2)
}

export function formatPct(pct) {
  if (pct == null) return '—'
  const sign = pct >= 0 ? '+' : ''
  return sign + pct.toFixed(2) + '%'
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatBlock(block) {
  if (!block) return '—'
  return '#' + Number(block).toLocaleString()
}

export function truncateAddress(addr, chars = 6) {
  if (!addr || addr.length < chars * 2) return addr || '—'
  return addr.slice(0, chars) + '…' + addr.slice(-4)
}

export function timeAgo(date) {
  if (!date) return ''
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
