export function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function uid(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function nextInvoiceNumber(prefix, existingNumbers) {
  const p = (prefix || 'INV').replace(/\/+$/, '')
  let max = 0
  for (const num of existingNumbers || []) {
    const m = String(num).match(/(\d+)\s*$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  const next = String(max + 1).padStart(4, '0')
  return `${p}${next}`
}
