import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Users,
  Receipt,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout() {
  const { logout, user } = useAuth()
  const nav = useNavigate()

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-56 bg-brand-900 text-white flex flex-col shrink-0">
        <div className="px-4 py-5 font-extrabold text-lg tracking-wide border-b border-white/10">
          BillDesk Pro
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                  isActive ? 'bg-white/15' : 'hover:bg-white/10 text-white/80'
                }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="text-[11px] text-white/50 truncate mb-2">{user?.email}</div>
          <button
            type="button"
            onClick={async () => {
              await logout()
              nav('/login')
            }}
            className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
