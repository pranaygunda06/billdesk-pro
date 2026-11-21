import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, doc, updateDoc, getDoc } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Copy, Download, ExternalLink } from 'lucide-react'
import { db } from '../firebase'
import { formatCurrency, formatDate, makeShareToken } from '../utils/format'
import { downloadInvoicePdf } from '../utils/pdfInvoice'

export default function Invoices() {
  const [list, setList] = useState([])
  const [business, setBusiness] = useState({})

  useEffect(() => {
    getDoc(doc(db, 'settings', 'business')).then((s) => {
      if (s.exists()) setBusiness(s.data())
    })
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function ensureToken(inv) {
    if (inv.shareToken) return inv.shareToken
    const token = makeShareToken()
    await updateDoc(doc(db, 'invoices', inv.id), { shareToken: token })
    return token
  }

  async function publicLink(inv) {
    const token = await ensureToken(inv)
    return `${window.location.origin}/p/${token}`
  }

  async function copyLink(inv) {
    const url = await publicLink(inv)
    await navigator.clipboard.writeText(url)
    toast.success('Secure link copied')
  }

  async function markPaid(inv) {
    await updateDoc(doc(db, 'invoices', inv.id), { paymentStatus: 'Paid' })
    toast.success('Marked paid')
  }

  async function pdf(inv) {
    const url = await publicLink(inv)
    await downloadInvoicePdf({
      invoice: inv,
      business,
      publicUrl: url,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extrabold">Invoices</h1>
        <Link to="/billing" className="px-4 py-2 rounded-xl bg-brand-700 text-white text-sm font-bold">
          + New
        </Link>
      </div>
      <p className="text-xs text-slate-500">
        Share links use a random secure token (<code className="bg-slate-100 px-1 rounded">/p/…</code>), not the invoice number — cannot be guessed.
      </p>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="px-4 py-3 font-bold">{inv.invoiceNumber}</td>
                <td className="px-4 py-3">{inv.customerName}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(inv.grandTotal)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    inv.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {inv.paymentStatus || 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                  <button type="button" title="Copy secure link" onClick={() => copyLink(inv)} className="p-1.5 hover:bg-slate-100 rounded">
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    title="Open public page"
                    onClick={async () => window.open(await publicLink(inv), '_blank')}
                    className="p-1.5 hover:bg-slate-100 rounded"
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button type="button" title="PDF" onClick={() => pdf(inv)} className="p-1.5 hover:bg-slate-100 rounded">
                    <Download size={14} />
                  </button>
                  {inv.paymentStatus !== 'Paid' && (
                    <button type="button" onClick={() => markPaid(inv)} className="text-xs font-bold text-emerald-700 ml-1">
                      Mark paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  No invoices yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
