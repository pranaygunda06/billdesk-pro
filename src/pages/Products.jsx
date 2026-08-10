import { useEffect, useState } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import toast from 'react-hot-toast'
import { Camera, Plus, Trash2 } from 'lucide-react'
import { db } from '../firebase'
import { formatCurrency, uid } from '../utils/format'
import BarcodeScanner from '../components/BarcodeScanner'

const empty = () => ({
  name: '',
  barcode: '',
  brand: '',
  unit: 'pcs',
  purchasePrice: 0,
  sellingPrice: 0,
  gstPercent: 0,
  stock: 0,
  hsn: '',
})

export default function Products() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(empty())
  const [editId, setEditId] = useState(null)
  const [open, setOpen] = useState(false)
  const [scan, setScan] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'))
    return onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [])

  async function save(e) {
    e.preventDefault()
    if (!form.name || Number(form.sellingPrice) <= 0) {
      toast.error('Name and selling price required')
      return
    }
    const payload = {
      ...form,
      purchasePrice: Number(form.purchasePrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      gstPercent: Number(form.gstPercent) || 0,
      stock: Number(form.stock) || 0,
      updatedAt: new Date().toISOString(),
    }
    try {
      if (editId) {
        await updateDoc(doc(db, 'products', editId), payload)
        toast.success('Product updated')
      } else {
        await addDoc(collection(db, 'products'), {
          ...payload,
          createdAt: new Date().toISOString(),
        })
        toast.success('Product saved to cloud')
      }
      setOpen(false)
      setEditId(null)
      setForm(empty())
    } catch (err) {
      toast.error(err.message || 'Save failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Products</h1>
        <button
          type="button"
          onClick={() => {
            setForm(empty())
            setEditId(null)
            setOpen(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-700 text-white font-bold text-sm"
        >
          <Plus size={16} /> Add product
        </button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Barcode</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">{p.barcode || '—'}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(p.sellingPrice)}</td>
                <td className="px-4 py-3 text-right">{p.stock ?? 0}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    type="button"
                    className="text-brand-700 font-bold text-xs"
                    onClick={() => {
                      setForm({
                        name: p.name || '',
                        barcode: p.barcode || '',
                        brand: p.brand || '',
                        unit: p.unit || 'pcs',
                        purchasePrice: p.purchasePrice || 0,
                        sellingPrice: p.sellingPrice || 0,
                        gstPercent: p.gstPercent || 0,
                        stock: p.stock || 0,
                        hsn: p.hsn || '',
                      })
                      setEditId(p.id)
                      setOpen(true)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-rose-600"
                    onClick={async () => {
                      if (!confirm('Delete?')) return
                      await deleteDoc(doc(db, 'products', p.id))
                      toast.success('Deleted')
                    }}
                  >
                    <Trash2 size={14} className="inline" />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  No products yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg">{editId ? 'Edit' : 'New'} product</h2>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="flex gap-2">
              <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              <button type="button" onClick={() => setScan(true)} className="px-3 rounded-lg bg-emerald-600 text-white text-sm font-bold inline-flex items-center gap-1">
                <Camera size={16} /> Scan
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Selling *" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Purchase" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="GST %" value={form.gstPercent} onChange={(e) => setForm({ ...form, gstPercent: e.target.value })} />
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-bold">Save to cloud</button>
            </div>
          </form>
        </div>
      )}

      <BarcodeScanner
        open={scan}
        onClose={() => setScan(false)}
        onScan={(code) => setForm((f) => ({ ...f, barcode: code }))}
        title="Scan product barcode"
      />
    </div>
  )
}
