export function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrency(n) {
  return money(n);
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = iso?.toDate ? iso.toDate() : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDate(iso) {
  return fmtDate(iso);
}

export function uid(prefix = '') {
  return `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Cryptographically strong unguessable share token for public links */
export function makeShareToken(bytes = 18) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let s = btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return s;
}

export function nextInvoiceNumber(prefix, existing = []) {
  const p = String(prefix || 'INV').replace(/\/+$/, '');
  let max = 0;
  for (const num of existing) {
    const m = String(num).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${p}${String(max + 1).padStart(4, '0')}`;
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
