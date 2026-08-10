import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import QRCode from 'qrcode'
import { db } from '../firebase'
import { formatCurrency, formatDate } from '../utils/format'
import { buildUpiLink } from '../utils/upi'

export default function PublicInvoice() {
  const { invoiceNumber = '' } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [business, setBusiness] = useState({})
  const [qr, setQr] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const num = decodeURIComponent(invoiceNumber)
        const q = query(collection(db, 'invoices'), where('invoiceNumber', '==', num))
        const snap = await getDocs(q)
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
        const upi = buildUpiLink({
          upiId: biz.upiId,
          name: biz.name,
          amount: inv.grandTotal,
          note: `Invoice ${inv.invoiceNumber}`,
          ref: inv.invoiceNumber,
        })
        const dataUrl = await QRCode.toDataURL(upi, { width: 200, margin: 1 })
        if (!cancelled) setQr(dataUrl)
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [invoiceNumber])

  const upiHref = useMemo(() => {
    if (!invoice) return '#'
    return buildUpiLink({
      upiId: business.upiId,
      name: business.name,
      amount: invoice.grandTotal,
      note: `Invoice ${invoice.invoiceNumber}`,
      ref: invoice.invoiceNumber,
    })
  }, [invoice, business])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading invoice…</div>
  }

  if (err || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border p-8 max-w-md text-center">
          <h1 className="text-xl font-extrabold">Invoice not found</h1>
          <p className="text-sm text-slate-500 mt-2">{err || 'Ask the sender for a valid link.'}</p>
        </div>
      </div>
    )
  }

  const paid = (invoice.paymentStatus || '').toLowerCase() === 'paid'

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <div className={`text-white px-5 pt-8 pb-20 ${paid ? 'bg-emerald-700' : 'bg-brand-900'}`}>
        <div className="max-w-md mx-auto text-center">
          <div className="text-xs font-bold uppercase opacity-80">{paid ? 'Paid' : 'Amount due'}</div>
          <div className="text-4xl font-black mt-2">{formatCurrency(invoice.grandTotal)}</div>
          <div className="text-sm opacity-90 mt-1">
            {invoice.invoiceNumber} · {formatDate(invoice.invoiceDate)}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto -mt-12 px-4 space-y-4">
        {!paid && (
          <div className="bg-white rounded-2xl border shadow-sm p-5 text-center space-y-3">
            <div className="font-bold">Scan QR · any UPI app</div>
            {qr ? <img src={qr} alt="UPI QR" className="mx-auto w-44 h-44" /> : <div className="h-44 flex items-center justify-center text-slate-400">QR…</div>}
            <div className="font-mono text-sm text-indigo-700 bg-slate-50 rounded-lg px-2 py-1 inline-block">{business.upiId || 'UPI not set'}</div>
            <a href={upiHref} className="block w-full py-3 rounded-xl bg-brand-700 text-white font-bold">
              Open UPI app
            </a>
          </div>
        )}

        <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-bold">From</div>
              <div className="font-bold">{business.name || 'Business'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-slate-400 font-bold">To</div>
              <div className="font-bold">{invoice.customerName}</div>
            </div>
          </div>
          <div className="border rounded-xl overflow-hidden text-sm">
            <div className="grid grid-cols-12 bg-brand-900 text-white text-[10px] font-bold uppercase px-2 py-2">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-4 text-right">Total</div>
            </div>
            {(invoice.items || []).map((it, i) => (
              <div key={i} className="grid grid-cols-12 px-2 py-2 border-t">
                <div className="col-span-6 font-semibold truncate">{it.name}</div>
                <div className="col-span-2 text-center">{it.qty}</div>
                <div className="col-span-4 text-right font-bold">{formatCurrency(it.lineTotal)}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-extrabold text-lg">
            <span>Total</span>
            <span>{formatCurrency(invoice.grandTotal)}</span>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400">Bill & payment only · BillDesk Pro</p>
      </div>
    </div>
  )
}
