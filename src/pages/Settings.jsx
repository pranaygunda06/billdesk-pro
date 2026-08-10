import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { db } from '../firebase'

export default function Settings() {
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    gstNumber: '',
    upiId: '',
    invoicePrefix: 'INV',
    footer: '',
    terms: '',
  })

  useEffect(() => {
    getDoc(doc(db, 'settings', 'business')).then((snap) => {
      if (snap.exists()) setForm((f) => ({ ...f, ...snap.data() }))
    })
  }, [])

  async function save(e) {
    e.preventDefault()
    try {
      await setDoc(doc(db, 'settings', 'business'), form, { merge: true })
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">Business settings</h1>
      <form onSubmit={save} className="bg-white rounded-2xl border p-6 space-y-3">
        {[
          ['name', 'Business name'],
          ['address', 'Address'],
          ['phone', 'Phone'],
          ['gstNumber', 'GST number'],
          ['upiId', 'UPI ID (for QR)'],
          ['invoicePrefix', 'Invoice prefix'],
          ['footer', 'Invoice footer'],
          ['terms', 'Terms'],
        ].map(([key, label]) => (
          <label key={key} className="block">
            <span className="text-xs font-bold uppercase text-slate-500">{label}</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form[key] || ''}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-brand-700 text-white font-bold text-sm">
          Save
        </button>
      </form>
    </div>
  )
}
