import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { formatCurrency } from '../utils/format'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [stats, setStats] = useState({ products: 0, customers: 0, invoices: 0, sales: 0 })

  useEffect(() => {
    ;(async () => {
      const [p, c, inv] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'invoices')),
      ])
      let sales = 0
      inv.forEach((d) => {
        sales += Number(d.data().grandTotal || 0)
      })
      setStats({
        products: p.size,
        customers: c.size,
        invoices: inv.size,
        sales,
      })
    })()
  }, [])

  const cards = [
    { label: 'Products', value: stats.products, to: '/products' },
    { label: 'Customers', value: stats.customers, to: '/customers' },
    { label: 'Invoices', value: stats.invoices, to: '/invoices' },
    { label: 'Total billed', value: formatCurrency(stats.sales), to: '/invoices' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="bg-white rounded-2xl border p-5 shadow-sm hover:border-brand-300">
            <div className="text-xs font-bold uppercase text-slate-400">{c.label}</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{c.value}</div>
          </Link>
        ))}
      </div>
      <Link
        to="/billing"
        className="inline-flex px-5 py-3 rounded-xl bg-brand-700 text-white font-bold shadow"
      >
        + New Invoice
      </Link>
    </div>
  )
}
