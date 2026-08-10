export function buildUpiLink({ upiId, name, amount, note, ref }) {
  const qs = new URLSearchParams()
  qs.set('pa', upiId || '')
  qs.set('pn', name || 'Payee')
  qs.set('cu', 'INR')
  if (amount > 0) qs.set('am', Number(amount).toFixed(2))
  if (note) qs.set('tn', note)
  if (ref) qs.set('tr', ref)
  return `upi://pay?${qs.toString()}`
}
