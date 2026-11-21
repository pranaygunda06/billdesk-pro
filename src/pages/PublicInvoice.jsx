import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import QRCode from 'qrcode'
import { db } from '../firebase'
import { formatCurrency, formatDate } from '../utils/format'
import { buildUpiLink } from '../utils/upi'

export default function PublicInvoice() {
  const params = useParams()
  const token = params.token
  const invoiceNumber = params.invoiceNumber
  const [invoice, setInvoice] = useState(null)
  const [business, setBusiness] = useState({})
  const [qrFull, setQrFull] = useState('')
  const [qrOpen, setQrOpen] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [mode, setMode] = useState('full')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        let snap
        if (token) {
          snap = await getDocs(query(collection(db, 'invoices'), where('shareToken', '==', token)))
        } else if (invoiceNumber) {
          const num = decodeURIComponent(invoiceNumber)
          snap = await getDocs(query(collection(db, 'invoices'), where('invoiceNumber', '==', num)))
        } else {
          if (!cancelled) setErr('Invalid link')
          return
        }
        if (snap.empty) {
          if (!cancelled) setErr('Invoice not found')
          return
        }
        const inv = { id: snap.docs[0].id, ...snap.docs[0].data() }
        const bizSnap = await getDoc(doc(db, 'settings', 'business'))
        const biz = bizSnap.exists() ? bizSnap.data() : {}
        if (!cancelled) {
          setInvoice(inv)
          setBusiness(biz)
        }
        if (inv.paymentStatus !== 'Paid' && biz.upiId) {
          const full = buildUpiLink({
            upiId: biz.upiId,
            name: biz.name,
            amount: inv.grandTotal,
            note: `Invoice ${inv.invoiceNumber}`,
            invoiceNumber: inv.invoiceNumber,
          })
          const openAmt = buildUpiLink({
            upiId: biz.upiId,
            name: biz.name,
            note: `Invoice ${inv.invoiceNumber}`,
            invoiceNumber: inv.invoiceNumber,
            omitAmount: true,
          })
          if (full) {
            const dataUrl = await QRCode.toDataURL(full, { width: 220, margin: 1 })
            if (!cancelled) setQrFull(dataUrl)
          }
          if (openAmt) {
            const dataUrl2 = await QRCode.toDataURL(openAmt, { width: 220, margin: 1 })
            if (!cancelled) setQrOpen(dataUrl2)
          }
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, invoiceNumber])

  const upiFull = useMemo(() => {
    if (!invoice || !business?.upiId) return '#'
    return buildUpiLink({
      upiId: business.upiId,
      name: business.name,
      amount: invoice.grandTotal,
      note: `Invoice ${invoice.invoiceNumber}`,
      invoiceNumber: invoice.invoiceNumber,
    })
  }, [invoice, business])

  const upiOpen = useMemo(() => {
    if (!invoice || !business?.upiId) return '#'
    return buildUpiLink({
      upiId: business.upiId,
      name: business.name,
      note: `Invoice ${invoice.invoiceNumber}`,
      invoiceNumber: invoice.invoiceNumber,
      omitAmount: true,
    })
  }, [invoice, business])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading invoice…</div>
  }

  if (err || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <div className="bg-white rounded-2xl border p-8 max-w-md text-center shadow-sm">
          <h1 className="text-xl font-extrabold">Link invalid</h1>
          <p className="text-sm text-slate-500 mt-2">{err || 'Ask the sender for a new secure payment link.'}</p>
        </div>
      </div>
    )
  }

  const paid = (invoice.paymentStatus || '').toLowerCase() === 'paid'
  const activeQr = mode === 'full' ? qrFull : qrOpen
  const activeUpi = mode === 'full' ? upiFull : upiOpen

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-100 pb-16">
      <div className={`px-4 pt-10 pb-24 text-white ${paid ? 'bg-emerald-700' : ''}`}>
        <div className="mx-auto max-w-lg text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
            {paid ? 'Payment received' : 'Tax invoice'}
          </div>
          <div className="mt-2 text-4xl font-black tracking-tight">{formatCurrency(invoice.grandTotal)}</div>
          <div className="mt-2 text-sm text-white/80">
            {invoice.invoiceNumber} · {formatDate(invoice.invoiceDate)}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg -mt-16 space-y-4 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white">
            <div className="text-lg font-extrabold">{business.name || 'Business'}</div>
            {business.address && (
              <div className="text-xs text-white/80 mt-1 whitespace-pre-line">{business.address}</div>
            )}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/75">
              {business.phone && <span>Ph: {business.phone}</span>}
              {business.gstNumber && <span>GST: {business.gstNumber}</span>}
            </div>
          </div>

          <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-slate-100 text-sm">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bill to</div>
              <div className="font-bold text-slate-900">{invoice.customerName}</div>
              {invoice.customerPhone && <div className="text-xs text-slate-500">{invoice.customerPhone}</div>}
              {invoice.customerAddress && (
                <div className="text-xs text-slate-500 mt-0.5">{invoice.customerAddress}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invoice</div>
              <div className="font-bold">{invoice.invoiceNumber}</div>
              <div className="text-xs text-slate-500">{formatDate(invoice.invoiceDate)}</div>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {invoice.paymentStatus || 'Pending'}
              </span>
            </div>
          </div>

          <div className="px-2 py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 text-left font-bold">Item</th>
                  <th className="px-2 py-2 text-center font-bold">Qty</th>
                  <th className="px-2 py-2 text-right font-bold">Rate</th>
                  <th className="px-3 py-2 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((it, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-800">{it.name}</td>
                    <td className="px-2 py-2.5 text-center text-slate-600">{it.qty}</td>
                    <td className="px-2 py-2.5 text-right text-slate-600">{formatCurrency(it.price)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      {formatCurrency(it.lineTotal ?? it.qty * it.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-5 py-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span>−{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {Number(invoice.gstAmount) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>GST</span>
                <span>{formatCurrency(invoice.gstAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
              <span>Grand total</span>
              <span className="text-indigo-700">{formatCurrency(invoice.grandTotal)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="px-5 pb-4 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Notes: </span>
              {invoice.notes}
            </div>
          )}
          {business.footer && (
            <div className="bg-slate-50 px-5 py-3 text-center text-[11px] text-slate-500 border-t">
              {business.footer}
            </div>
          )}
        </div>

        {!paid && business.upiId && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-5 space-y-4">
            <div className="text-center">
              <div className="font-extrabold text-slate-900">Pay with UPI</div>
              <div className="text-xs text-slate-500 mt-1">Choose how you want to pay</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('full')}
                className={`rounded-xl border-2 px-3 py-3 text-left transition ${
                  mode === 'full' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-slate-500 uppercase">Option 1</div>
                <div className="font-bold text-slate-900 mt-0.5">Pay full amount</div>
                <div className="text-sm font-extrabold text-indigo-700 mt-1">
                  {formatCurrency(invoice.grandTotal)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`rounded-xl border-2 px-3 py-3 text-left transition ${
                  mode === 'custom' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-slate-500 uppercase">Option 2</div>
                <div className="font-bold text-slate-900 mt-0.5">Custom amount</div>
                <div className="text-xs text-slate-500 mt-1">Enter amount in UPI app</div>
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              {activeQr ? (
                <img
                  src={activeQr}
                  alt="UPI QR"
                  className="w-48 h-48 rounded-xl border border-slate-100 bg-white p-2"
                />
              ) : (
                <div className="w-48 h-48 rounded-xl bg-slate-100 animate-pulse" />
              )}
              <div className="font-mono text-sm text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg">
                {business.upiId}
              </div>
              {mode === 'full' ? (
                <p className="text-xs text-slate-500 text-center">
                  QR is locked to <strong>{formatCurrency(invoice.grandTotal)}</strong>
                </p>
              ) : (
                <p className="text-xs text-slate-500 text-center">
                  Opens UPI with <strong>no amount</strong> — type any amount in your app
                </p>
              )}
              <a
                href={activeUpi || '#'}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-center shadow"
              >
                {mode === 'full'
                  ? `Pay ${formatCurrency(invoice.grandTotal)} in UPI app`
                  : 'Open UPI · enter amount yourself'}
              </a>
            </div>
          </div>
        )}

        {paid && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center text-emerald-800 font-semibold">
            This invoice is marked as paid. Thank you!
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400">Secure link · Bill & payment only</p>
      </div>
    </div>
  )
}
