import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
} from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Camera, Plus, Trash2 } from 'lucide-react'
import { db } from '../firebase'
import { formatCurrency, nextInvoiceNumber, uid, makeShareToken } from '../utils/format'
import BarcodeScanner from '../components/BarcodeScanner'

export default function Billing() {
  const nav = useNavigate()
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [settings, setSettings] = useState({ invoicePrefix: 'INV', upiId: '', name: '' })
  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState([])
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState({ name: '', price: '', qty: 1, gstPercent: 0, barcode: '', saveToProducts: true })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsubP = onSnapshot(query(collection(db, 'products'), orderBy('name')), (s) =>
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    )
    const unsubC = onSnapshot(query(collection(db, 'customers'), orderBy('name')), (s) =>
      setCustomers(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    )
    getDoc(doc(db, 'settings', 'business')).then((snap) => {
      if (snap.exists()) setSettings((x) => ({ ...x, ...snap.data() }))
    })
    return () => {
      unsubP()
      unsubC()
    }
  }, [])

  function addProductLine(p) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id)
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, qty: Number(l.qty) + 1, lineTotal: (Number(l.qty) + 1) * Number(l.price) } : l,
        )
      }
      return [
        ...prev,
        {
          id: uid('line_'),
          productId: p.id,
          name: p.name,
          barcode: p.barcode || '',
          qty: 1,
          price: Number(p.sellingPrice) || 0,
          gstPercent: Number(p.gstPercent) || 0,
          lineTotal: Number(p.sellingPrice) || 0,
          custom: false,
        },
      ]
    })
  }

  function onBarcode(code) {
    const p = products.find((x) => String(x.barcode || '') === String(code))
    if (p) {
      addProductLine(p)
      toast.success(`Added ${p.name}`)
    } else {
      setCustom({ name: '', price: '', qty: 1, gstPercent: 0, barcode: code, saveToProducts: true })
      setCustomOpen(true)
      toast('Barcode not found — add as custom product')
    }
  }

  async function addCustomLine(e) {
    e.preventDefault()
    if (!custom.name || Number(custom.price) <= 0) {
      toast.error('Name and price required')
      return
    }
    const price = Number(custom.price)
    const qty = Number(custom.qty) || 1
    const gstPercent = Number(custom.gstPercent) || 0
    let productId = null

    if (custom.saveToProducts) {
      try {
        const ref = await addDoc(collection(db, 'products'), {
          name: custom.name,
          barcode: custom.barcode || '',
          sellingPrice: price,
          purchasePrice: 0,
          gstPercent,
          stock: 0,
          unit: 'pcs',
          createdAt: new Date().toISOString(),
        })
        productId = ref.id
        toast.success('Custom product saved to Products for future use')
      } catch (err) {
        toast.error('Could not save product: ' + (err.message || ''))
      }
    }

    setLines((prev) => [
      ...prev,
      {
        id: uid('line_'),
        productId,
        name: custom.name,
        barcode: custom.barcode || '',
        qty,
        price,
        gstPercent,
        lineTotal: qty * price,
        custom: true,
      },
    ])
    setCustomOpen(false)
    setCustom({ name: '', price: '', qty: 1, gstPercent: 0, barcode: '', saveToProducts: true })
  }

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + Number(l.qty) * Number(l.price), 0)
    const disc = Number(discount) || 0
    const afterDisc = Math.max(0, subtotal - disc)
    let gst = 0
    for (const l of lines) {
      const base = Number(l.qty) * Number(l.price)
      const share = subtotal > 0 ? base / subtotal : 0
      const lineBase = base - disc * share
      gst += (lineBase * (Number(l.gstPercent) || 0)) / 100
    }
    const grandTotal = afterDisc + gst
    return { subtotal, discount: disc, gst, grandTotal }
  }, [lines, discount])

  async function createInvoice() {
    if (!customerId) return toast.error('Select customer')
    if (lines.length === 0) return toast.error('Add at least one item')
    setBusy(true)
    try {
      const invSnap = await getDocs(collection(db, 'invoices'))
      const numbers = invSnap.docs.map((d) => d.data().invoiceNumber)
      const invoiceNumber = nextInvoiceNumber(settings.invoicePrefix || 'INV', numbers)
      const cust = customers.find((c) => c.id === customerId)
      const shareToken = makeShareToken()

      const invoice = {
        invoiceNumber,
        shareToken,
        customerId,
        customerName: cust?.name || '',
        customerPhone: cust?.phone || '',
        customerAddress: cust?.address || '',
        items: lines.map((l) => ({
          name: l.name,
          productId: l.productId || null,
          barcode: l.barcode || '',
          qty: Number(l.qty),
          price: Number(l.price),
          gstPercent: Number(l.gstPercent) || 0,
          lineTotal: Number(l.qty) * Number(l.price),
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        gstAmount: totals.gst,
        grandTotal: totals.grandTotal,
        notes,
        paymentStatus: 'Pending',
        invoiceDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      await addDoc(collection(db, 'invoices'), invoice)
      toast.success(`Invoice ${invoiceNumber} created`)
      nav('/invoices')
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="text-2xl font-extrabold">New invoice</h1>

      <div className="bg-white rounded-2xl border p-4 space-y-3">
        <label className="block text-sm font-semibold">Customer</label>
        <select
          className="w-full border rounded-lg px-3 py-2.5 text-sm"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Select customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.phone ? `(${c.phone})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="font-bold">Items</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold"
            >
              <Camera size={16} /> Scan barcode
            </button>
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-700 text-white text-sm font-bold"
            >
              <Plus size={16} /> Custom product
            </button>
          </div>
        </div>

        <select
          className="w-full border rounded-lg px-3 py-2 text-sm"
          defaultValue=""
          onChange={(e) => {
            const p = products.find((x) => x.id === e.target.value)
            if (p) addProductLine(p)
            e.target.value = ''
          }}
        >
          <option value="">Add from products…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatCurrency(p.sellingPrice)}
            </option>
          ))}
        </select>

        <div className="divide-y border rounded-xl">
          {lines.map((l) => (
            <div key={l.id} className="p-3 flex flex-wrap gap-2 items-center text-sm">
              <div className="flex-1 min-w-[140px] font-semibold">
                {l.name}
                {l.custom && <span className="ml-1 text-[10px] text-brand-700">custom</span>}
              </div>
              <input
                type="number"
                className="w-16 border rounded px-2 py-1"
                value={l.qty}
                onChange={(e) => {
                  const qty = Number(e.target.value) || 0
                  setLines((prev) =>
                    prev.map((x) => (x.id === l.id ? { ...x, qty, lineTotal: qty * Number(x.price) } : x)),
                  )
                }}
              />
              <input
                type="number"
                className="w-24 border rounded px-2 py-1"
                value={l.price}
                onChange={(e) => {
                  const price = Number(e.target.value) || 0
                  setLines((prev) =>
                    prev.map((x) => (x.id === l.id ? { ...x, price, lineTotal: Number(x.qty) * price } : x)),
                  )
                }}
              />
              <div className="w-24 text-right font-bold">{formatCurrency(Number(l.qty) * Number(l.price))}</div>
              <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}>
                <Trash2 size={14} className="text-rose-600" />
              </button>
            </div>
          ))}
          {lines.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">No items yet</div>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
        <div className="flex justify-between items-center gap-4">
          <span>Discount (₹)</span>
          <input type="number" className="w-28 border rounded px-2 py-1 text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div className="flex justify-between"><span>GST</span><span>{formatCurrency(totals.gst)}</span></div>
        <div className="flex justify-between font-extrabold text-lg border-t pt-2">
          <span>Grand total</span>
          <span>{formatCurrency(totals.grandTotal)}</span>
        </div>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-2" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button
          type="button"
          disabled={busy}
          onClick={createInvoice}
          className="w-full py-3 rounded-xl bg-brand-700 text-white font-bold disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create invoice'}
        </button>
      </div>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={onBarcode} title="Scan to add line" />

      {customOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={addCustomLine} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-3">
            <h2 className="font-bold text-lg">Custom product</h2>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Name *" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Barcode" value={custom.barcode} onChange={(e) => setCustom({ ...custom, barcode: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Price *" value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} />
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Qty" value={custom.qty} onChange={(e) => setCustom({ ...custom, qty: e.target.value })} />
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="GST %" value={custom.gstPercent} onChange={(e) => setCustom({ ...custom, gstPercent: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={custom.saveToProducts} onChange={(e) => setCustom({ ...custom, saveToProducts: e.target.checked })} />
              Save to Products for future use
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCustomOpen(false)} className="px-4 py-2 text-sm font-semibold">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-bold">Add line</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
