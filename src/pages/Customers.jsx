import { useEffect, useState } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { db } from '../firebase'

export default function Customers() {
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '', gstNumber: '' })

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('name'))
    return onSnapshot(q, (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function save(e) {
    e.preventDefault()
    if (!form.name) return toast.error('Name required')
    try {
      if (editId) {
        await updateDoc(doc(db, 'customers', editId), { ...form, updatedAt: new Date().toISOString() })
      } else {
        await addDoc(collection(db, 'customers'), { ...form, createdAt: new Date().toISOString() })
      }
      toast.success('Saved')
      setOpen(false)
      setEditId(null)
      setForm({ name: '', phone: '', address: '', gstNumber: '' })
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extrabold">Customers</h1>
        <button type="button" onClick={() => { setForm({ name: '', phone: '', address: '', gstNumber: '' }); setEditId(null); setOpen(true) }} className="inline-flex gap-2 items-center px-4 py-2 rounded-xl bg-brand-700 text-white font-bold text-sm">
          <Plus size={16} /> Add
        </button>
      </div>
      <div className="bg-white rounded-2xl border divide-y">
        {list.map((c) => (
          <div key={c.id} className="px-4 py-3 flex justify-between items-center">
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-slate-500">{c.phone || '—'}</div>
            </div>
            <div className="space-x-3 text-sm">
              <button type="button" className="text-brand-700 font-bold" onClick={() => { setForm({ name: c.name || '', phone: c.phone || '', address: c.address || '', gstNumber: c.gstNumber || '' }); setEditId(c.id); setOpen(true) }}>Edit</button>
              <button type="button" className="text-rose-600" onClick={async () => { if (confirm('Delete?')) { await deleteDoc(doc(db, 'customers', c.id)); toast.success('Deleted') } }}>Delete</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="p-10 text-center text-slate-400">No customers</div>}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-3">
            <h2 className="font-bold text-lg">{editId ? 'Edit' : 'New'} customer</h2>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="GST" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-semibold">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-bold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
