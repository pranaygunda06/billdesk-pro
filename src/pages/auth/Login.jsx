import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../auth/AuthContext'

export default function Login() {
  const { login, user, isAdmin, loading, hasAnyAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  if (!loading && user && isAdmin) return <Navigate to="/dashboard" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await login(email, password)
      toast.success('Welcome back')
      nav('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-indigo-800 to-brand-900 p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Admin Login</h1>
          <p className="text-sm text-slate-500 mt-1">BillDesk Pro — cloud billing</p>
        </div>
        <label className="block">
          <span className="text-xs font-bold uppercase text-slate-500">Email</span>
          <input
            type="email"
            required
            className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-slate-500">Password</span>
          <input
            type="password"
            required
            className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-xl bg-brand-700 text-white font-bold disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {hasAnyAdmin === false && (
          <p className="text-center text-sm text-slate-600">
            No admin yet.{' '}
            <Link to="/register" className="text-brand-700 font-bold">
              Register as Admin
            </Link>
          </p>
        )}
      </form>
    </div>
  )
}
